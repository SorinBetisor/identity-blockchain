"""
Composed client for orchestrating the full bank-client workflow.

This module wires the off-chain Python services to the deployed Solidity system:
- Loads contract ABIs/addresses
- Handles signing and sending transactions for users, requesters, and validators
- Bridges FinancialDataStorage, consent checks, and credit calculations
- Provides helpers for the steps in docs/workflow-bank-client.md
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from eth_account import Account
from eth_account.messages import encode_defunct
from hexbytes import HexBytes
from web3 import Web3
from web3.contract import Contract

try:
    from ..data_storage import FinancialData, FinancialDataStorage, UserDirectory  # type: ignore
    from .consent_data_service import ConsentDataService  # type: ignore
    from .financial_data_service import FinancialDataService, Summary  # type: ignore
    from .identity_verification import IdentityVerification  # type: ignore
except ImportError:
    from data_storage import FinancialData, FinancialDataStorage, UserDirectory  # type: ignore
    from data_services.consent_data_service import ConsentDataService  # type: ignore
    from data_services.financial_data_service import FinancialDataService, Summary  # type: ignore
    from data_services.identity_verification import IdentityVerification  # type: ignore

CREDIT_TIERS = [
    "None",
    "LowBronze",
    "MidBronze",
    "HighBronze",
    "LowSilver",
    "MidSilver",
    "HighSilver",
    "LowGold",
    "MidGold",
    "HighGold",
    "LowPlatinum",
    "MidPlatinum",
    "HighPlatinum",
]
INCOME_BANDS = [
    "None",
    "upto25k",
    "upto50k",
    "upto75k",
    "upto100k",
    "upto150k",
    "upto200k",
    "upto250k",
    "upto300k",
    "upto350k",
    "upto400k",
    "upto450k",
    "upto500k",
    "moreThan500k",
]
CONSENT_STATUS = {
    "None": 0,
    "Granted": 1,
    "Requested": 2,
    "Revoked": 3,
    "Expired": 4,
}


def _load_artifact(contract_name: str, artifacts_root: Path = Path("artifacts/contracts")) -> Dict[str, Any]:
    """Load Hardhat artifact JSON to obtain ABI."""
    artifact_path = artifacts_root / f"{contract_name}.sol" / f"{contract_name}.json"
    if not artifact_path.exists():
        raise FileNotFoundError(f"Missing artifact for {contract_name} at {artifact_path}")
    with open(artifact_path, "r", encoding="utf-8") as artifact_file:
        return json.load(artifact_file)


def _ensure_bytes32(value: bytes | str) -> bytes:
    """Normalize input to 32-byte value for dataPointer/consent IDs."""
    if isinstance(value, str):
        cleaned = value[2:] if value.startswith("0x") else value
        value_bytes = bytes.fromhex(cleaned)
    else:
        value_bytes = value
    if len(value_bytes) != 32:
        raise ValueError("Expected 32-byte value")
    return value_bytes


def _normalize_address(address: str) -> str:
    """Return a checksum address; Web3 handles validation."""
    return Web3.to_checksum_address(address)


def _parse_frontend_addresses(config_path: Path) -> Dict[str, str]:
    """Parse frontend/src/contracts.ts to recover deployed addresses."""
    if not config_path.exists():
        raise FileNotFoundError(f"contracts.ts not found at {config_path}")
    contents = config_path.read_text(encoding="utf-8")
    addresses: Dict[str, str] = {}
    for line in contents.splitlines():
        if ":" in line and '"' in line:
            try:
                key_part, value_part = line.split(":", 1)
                key = key_part.strip().strip('"').strip()
                addr = value_part.split('"')[1]
                if addr.startswith("0x") and len(addr) == 42:
                    addresses[key] = addr
            except (IndexError, ValueError):
                continue
    required = {"IdentityRegistry", "ConsentManager", "DataBroker", "DataSharingToken"}
    if not required.issubset(addresses.keys()):
        missing = required - set(addresses.keys())
        raise ValueError(f"Failed to parse contract addresses. Missing: {', '.join(sorted(missing))}")
    return addresses


@dataclass
class Contracts:
    identity_registry: Contract
    consent_manager: Contract
    data_broker: Contract
    reward_token: Contract


class CreditCalculator:
    """Wrap FinancialDataService to expose calculator-style helpers used by the validator."""

    def __init__(self, service: Optional[FinancialDataService] = None):
        self.service = service or FinancialDataService()

    def calculate_net_worth(self, financial_data: FinancialData) -> float:
        return financial_data.calculate_net_worth()

    def calculate_risk_score(
        self,
        financial_data: FinancialData,
        annual_income: Optional[float] = None,
        total_credit_limit: Optional[float] = None,
    ) -> float:
        summary = self.service.compute_summary(financial_data, annual_income, total_credit_limit)
        return summary.risk_score

    def classify_credit_tier(self, risk_score: float) -> str:
        return self.service._map_tier(risk_score)

    def classify_income_band(self, annual_income: Optional[float]) -> str:
        return self.service._map_income_band(annual_income)

    def summarize(
        self,
        financial_data: FinancialData,
        annual_income: Optional[float] = None,
        total_credit_limit: Optional[float] = None,
    ) -> Summary:
        return self.service.compute_summary(financial_data, annual_income, total_credit_limit)


class DocumentValidatorService:
    """
    Validator-side service that inspects submitted documents/financial data,
    calculates classifications, and updates the on-chain profile when authorized.
    """

    def __init__(self, calculator: Optional[CreditCalculator] = None):
        self.calculator = calculator or CreditCalculator()

    def validate_documents(self, encrypted_docs: bytes) -> bool:
        """Placeholder document validation hook; replace with real checks in production."""
        return bool(encrypted_docs)

    def calculate_credit_tier(self, financial_data: FinancialData) -> str:
        risk = self.calculator.calculate_risk_score(financial_data)
        return self.calculator.classify_credit_tier(risk)

    def calculate_income_band(self, annual_income: Optional[float]) -> str:
        return self.calculator.classify_income_band(annual_income)

    def update_on_chain_profile(
        self,
        identity_registry: Contract,
        send_tx: Callable[[Any, str], Dict[str, Any]],
        validator_private_key: str,
        user_address: str,
        summary: Summary,
    ) -> Dict[str, Any]:
        """Call IdentityRegistry.updateProfile as the validator."""
        credit_enum = CREDIT_TIERS.index(summary.credit_tier)
        income_enum = INCOME_BANDS.index(summary.income_band)
        tx_fn = identity_registry.functions.updateProfile(
            credit_enum,
            income_enum,
            _normalize_address(user_address),
        )
        return send_tx(tx_fn, validator_private_key)


class DataSharingClient:
    """
    High-level orchestrator for the bank-client workflow.

    Typical usage:
      client = DataSharingClient(Web3(Web3.HTTPProvider("http://127.0.0.1:8545")))
      receipt = client.register_identity(user_private_key)
      pointer, summary = client.save_financial_profile(financial_data, user_private_key, validator_private_key, annual_income)
      client.create_and_grant_consent(user_private_key, bank_address, start_ts, end_ts)
      credit_tier = client.request_credit_tier(bank_private_key, user_address)
    """

    def __init__(
        self,
        web3: Web3,
        addresses: Optional[Dict[str, str]] = None,
        artifacts_root: Path = Path("artifacts/contracts"),
        frontend_contracts_path: Path = Path("frontend/src/contracts.ts"),
        storage: Optional[FinancialDataStorage] = None,
        user_directory: Optional[UserDirectory] = None,
        identity_verification: Optional[IdentityVerification] = None,
    ):
        self.w3 = web3
        self.chain_id = web3.eth.chain_id
        self.artifacts_root = artifacts_root
        self.addresses = addresses or _parse_frontend_addresses(frontend_contracts_path)

        identity_abi = _load_artifact("IdentityRegistry", artifacts_root)["abi"]
        consent_abi = _load_artifact("ConsentManager", artifacts_root)["abi"]
        broker_abi = _load_artifact("DataBroker", artifacts_root)["abi"]
        token_abi = _load_artifact("DataSharingToken", artifacts_root)["abi"]

        self.contracts = Contracts(
            identity_registry=self.w3.eth.contract(
                address=_normalize_address(self.addresses["IdentityRegistry"]),
                abi=identity_abi,
            ),
            consent_manager=self.w3.eth.contract(
                address=_normalize_address(self.addresses["ConsentManager"]),
                abi=consent_abi,
            ),
            data_broker=self.w3.eth.contract(
                address=_normalize_address(self.addresses["DataBroker"]),
                abi=broker_abi,
            ),
            reward_token=self.w3.eth.contract(
                address=_normalize_address(self.addresses["DataSharingToken"]),
                abi=token_abi,
            ),
        )

        self.storage = storage or FinancialDataStorage()
        self.user_directory = user_directory or UserDirectory(data_dir=str(self.storage.data_dir))
        self.identity_verification = identity_verification or IdentityVerification()
        self.credit_calculator = CreditCalculator()
        self.validator_service = DocumentValidatorService(self.credit_calculator)
        self.consent_service = ConsentDataService(
            web3_provider=self.w3,
            consent_manager_address=self.contracts.consent_manager.address,
            consent_manager_abi=consent_abi,
            storage=self.storage,
            user_directory=self.user_directory,
        )

    def _send_transaction(self, tx_fn: Any, private_key: str, value: int = 0) -> Dict[str, Any]:
        account = Account.from_key(private_key)
        nonce = self.w3.eth.get_transaction_count(account.address)
        tx: Dict[str, Any] = tx_fn.build_transaction(
            {
                "from": account.address,
                "nonce": nonce,
                "gasPrice": self.w3.eth.gas_price,
                "chainId": self.chain_id,
                "value": value,
            }
        )
        tx["gas"] = tx.get("gas") or self.w3.eth.estimate_gas(tx)
        signed = account.sign_transaction(tx)
        raw_tx = getattr(signed, "rawTransaction", None) or getattr(signed, "raw_transaction", None)
        tx_hash = self.w3.eth.send_raw_transaction(raw_tx)
        return self.w3.eth.wait_for_transaction_receipt(tx_hash)

    def _send_transaction_impersonated(self, tx_fn: Any, from_address: str, value: int = 0) -> Dict[str, Any]:
        """
        Hardhat-only helper to impersonate an address (e.g., validator) and send a transaction without its private key.
        """
        addr = _normalize_address(from_address)
        try:
            self.w3.provider.make_request("hardhat_impersonateAccount", [addr])
        except Exception:
            pass
        try:
            self.w3.provider.make_request(
                "hardhat_setBalance",
                [addr, hex(int(10**21))],
            )
        except Exception:
            pass

        nonce = self.w3.eth.get_transaction_count(addr)
        tx: Dict[str, Any] = tx_fn.build_transaction(
            {
                "from": addr,
                "nonce": nonce,
                "gasPrice": self.w3.eth.gas_price,
                "chainId": self.chain_id,
                "value": value,
            }
        )
        tx["gas"] = tx.get("gas") or self.w3.eth.estimate_gas(tx)
        tx_hash = self.w3.eth.send_transaction(tx)
        return self.w3.eth.wait_for_transaction_receipt(tx_hash)

    def register_identity(self, user_private_key: str) -> Dict[str, Any]:
        """User registers themselves on-chain."""
        tx_fn = self.contracts.identity_registry.functions.register()
        return self._send_transaction(tx_fn, user_private_key)

    def update_data_pointer(self, user_private_key: str, data_pointer: bytes | str) -> Dict[str, Any]:
        """User pushes the hash of their off-chain file to IdentityRegistry."""
        pointer = _ensure_bytes32(data_pointer)
        tx_fn = self.contracts.identity_registry.functions.updateDataPointer(pointer)
        return self._send_transaction(tx_fn, user_private_key)

    def verify_address_ownership(self, user_address: str, message: str, signature: str) -> bool:
        """Call on-chain verifyAddressOwnership to confirm signature provenance."""
        sig_bytes = HexBytes(signature)
        return self.contracts.identity_registry.functions.verifyAddressOwnership(
            _normalize_address(user_address),
            message,
            sig_bytes,
        ).call()

    def sign_ownership_challenge(self, user_private_key: str, message: str) -> str:
        """
        Client-side helper for step 2.2 in the workflow: sign a challenge so the bank can verify ownership.
        The contract expects the prefixed hash of the 32-byte keccak(message).
        """
        message_hash = self.w3.keccak(text=message)
        encoded = encode_defunct(primitive=message_hash)
        signed = Account.sign_message(encoded, private_key=user_private_key)
        return signed.signature.hex()

    def get_identity(self, user_address: str) -> Dict[str, Any]:
        """Fetch raw identity struct and derive friendly labels."""
        identity = self.contracts.identity_registry.functions.identities(_normalize_address(user_address)).call()
        return {
            "userDID": identity[0],
            "creditTier": CREDIT_TIERS[identity[1]] if identity[1] < len(CREDIT_TIERS) else identity[1],
            "incomeBand": INCOME_BANDS[identity[2]] if identity[2] < len(INCOME_BANDS) else identity[2],
            "dataPointer": identity[3].hex(),
        }

    def save_financial_profile(
        self,
        financial_data: FinancialData,
        user_private_key: str,
        validator_private_key: Optional[str] = None,
        annual_income: Optional[float] = None,
        total_credit_limit: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Persist off-chain data, update on-chain pointer, and optionally push validator summary.
        Returns hashes, summaries, and receipts for auditing.
        """
        data_hash = self.storage.save(financial_data)
        data_pointer = _ensure_bytes32(data_hash)

        pointer_receipt = self.update_data_pointer(user_private_key, data_pointer)
        summary = self.credit_calculator.summarize(financial_data, annual_income, total_credit_limit)

        profile_receipt = None
        if validator_private_key:
            profile_receipt = self.validator_service.update_on_chain_profile(
                identity_registry=self.contracts.identity_registry,
                send_tx=self._send_transaction,
                validator_private_key=validator_private_key,
                user_address=financial_data.userDID,
                summary=summary,
            )

        return {
            "dataPointer": data_pointer.hex(),
            "summary": summary,
            "updateDataPointerReceipt": pointer_receipt,
            "updateProfileReceipt": profile_receipt,
        }

    def verify_data_integrity(self, user_address: str) -> bool:
        """Compare stored file hash to the on-chain dataPointer."""
        on_chain = self.contracts.identity_registry.functions.identities(_normalize_address(user_address)).call()
        expected_pointer = on_chain[3]
        actual_hash = self.storage.calculate_file_hash(user_address)
        if actual_hash is None:
            return False
        return _ensure_bytes32(actual_hash) == _ensure_bytes32(expected_pointer)

    def validator_update_profile(
        self,
        financial_data: FinancialData,
        validator_private_key: str,
        annual_income: Optional[float] = None,
        total_credit_limit: Optional[float] = None,
        encrypted_documents: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """
        Standalone validator path: verify docs (if provided), compute summary, and push to IdentityRegistry.
        """
        if encrypted_documents is not None and not self.validator_service.validate_documents(encrypted_documents):
            raise ValueError("Document validation failed")
        summary = self.credit_calculator.summarize(financial_data, annual_income, total_credit_limit)
        receipt = self.validator_service.update_on_chain_profile(
            identity_registry=self.contracts.identity_registry,
            send_tx=self._send_transaction,
            validator_private_key=validator_private_key,
            user_address=financial_data.userDID,
            summary=summary,
        )
        return {"summary": summary, "updateProfileReceipt": receipt}

    def validator_update_profile_impersonated(
        self,
        financial_data: FinancialData,
        validator_address: str,
        annual_income: Optional[float] = None,
        total_credit_limit: Optional[float] = None,
        encrypted_documents: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """
        Hardhat-only path: impersonate validator address to push summary on-chain.
        """
        if encrypted_documents is not None and not self.validator_service.validate_documents(encrypted_documents):
            raise ValueError("Document validation failed")
        summary = self.credit_calculator.summarize(financial_data, annual_income, total_credit_limit)
        credit_enum = CREDIT_TIERS.index(summary.credit_tier)
        income_enum = INCOME_BANDS.index(summary.income_band)
        tx_fn = self.contracts.identity_registry.functions.updateProfile(
            credit_enum,
            income_enum,
            _normalize_address(financial_data.userDID),
        )
        receipt = self._send_transaction_impersonated(tx_fn, validator_address)
        return {"summary": summary, "updateProfileReceipt": receipt}

    def create_consent(
        self,
        user_private_key: str,
        requester_address: str,
        start_date: int,
        end_date: int,
    ) -> Dict[str, Any]:
        tx_fn = self.contracts.consent_manager.functions.createConsent(
            _normalize_address(requester_address),
            Account.from_key(user_private_key).address,
            int(start_date),
            int(end_date),
        )
        return self._send_transaction(tx_fn, user_private_key)

    def change_consent_status(
        self,
        user_private_key: str,
        requester_address: str,
        new_status: str = "Granted",
    ) -> Dict[str, Any]:
        consent_id = self._compute_consent_id(Account.from_key(user_private_key).address, requester_address)
        status_value = (
            CONSENT_STATUS.get(new_status)
            if isinstance(new_status, str)
            else int(new_status)
        )
        if status_value is None:
            raise ValueError(f"Unknown consent status: {new_status}")
        tx_fn = self.contracts.consent_manager.functions.changeStatus(
            Account.from_key(user_private_key).address,
            consent_id,
            status_value,
        )
        return self._send_transaction(tx_fn, user_private_key)

    def grant_consent(self, user_private_key: str, requester_address: str) -> Dict[str, Any]:
        return self.change_consent_status(user_private_key, requester_address, "Granted")

    def revoke_consent(self, user_private_key: str, requester_address: str) -> Dict[str, Any]:
        return self.change_consent_status(user_private_key, requester_address, "Revoked")

    def create_and_grant_consent(
        self,
        user_private_key: str,
        requester_address: str,
        start_date: int,
        end_date: int,
    ) -> Dict[str, Any]:
        """Create consent then grant it in sequence for smoother UX."""
        created = self.create_consent(user_private_key, requester_address, start_date, end_date)
        granted = self.change_consent_status(user_private_key, requester_address, "Granted")
        return {"createReceipt": created, "grantReceipt": granted}

    def is_consent_granted(self, user_address: str, requester_address: str) -> bool:
        return self.contracts.consent_manager.functions.isConsentGranted(
            _normalize_address(user_address),
            _normalize_address(requester_address),
        ).call()

    def request_credit_tier(self, requester_private_key: str, owner_address: str) -> Dict[str, Any]:
        tx_fn = self.contracts.data_broker.functions.getCreditTier(_normalize_address(owner_address))
        receipt = self._send_transaction(tx_fn, requester_private_key)
        tier = self.contracts.identity_registry.functions.getCreditTier(_normalize_address(owner_address)).call()
        label = CREDIT_TIERS[tier] if tier < len(CREDIT_TIERS) else tier
        granted_events = self.contracts.data_broker.events.DataAccessGranted().process_receipt(receipt)
        denied_events = self.contracts.data_broker.events.DataAccessDenied().process_receipt(receipt)
        reward_events = self.contracts.data_broker.events.RewardDistributed().process_receipt(receipt)
        return {
            "value": tier,
            "label": label,
            "receipt": receipt,
            "grantedEvents": granted_events,
            "deniedEvents": denied_events,
            "rewardEvents": reward_events,
        }

    def request_income_band(self, requester_private_key: str, owner_address: str) -> Dict[str, Any]:
        tx_fn = self.contracts.data_broker.functions.getIncomeBand(_normalize_address(owner_address))
        receipt = self._send_transaction(tx_fn, requester_private_key)
        band = self.contracts.identity_registry.functions.getIncomeBand(_normalize_address(owner_address)).call()
        label = INCOME_BANDS[band] if band < len(INCOME_BANDS) else band
        granted_events = self.contracts.data_broker.events.DataAccessGranted().process_receipt(receipt)
        denied_events = self.contracts.data_broker.events.DataAccessDenied().process_receipt(receipt)
        reward_events = self.contracts.data_broker.events.RewardDistributed().process_receipt(receipt)
        return {
            "value": band,
            "label": label,
            "receipt": receipt,
            "grantedEvents": granted_events,
            "deniedEvents": denied_events,
            "rewardEvents": reward_events,
        }

    def request_financial_file_with_consent(
        self,
        username_or_address: str,
        requester_address: str,
    ) -> Optional[FinancialData]:
        """
        Off-chain access path: verifies consent on-chain via ConsentDataService,
        then returns decrypted financial data from storage.
        """
        if username_or_address.startswith("0x"):
            return self.consent_service.request_data_by_address(username_or_address, requester_address)
        return self.consent_service.request_data_by_username(username_or_address, requester_address)

    def generate_email_otp(self, user_address: str) -> str:
        return self.identity_verification.generate_email_otp(user_address)

    def verify_email_otp(self, user_address: str, otp: str) -> bool:
        return self.identity_verification.verify_email_otp(user_address, otp)

    def record_national_id(self, user_address: str, id_number: str) -> str:
        return self.identity_verification.record_national_id(user_address, id_number)

    @staticmethod
    def default_challenge(bank_name: str) -> str:
        nonce = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        return f"{bank_name}-Verify-{nonce}"

    @staticmethod
    def _compute_consent_id(user_address: str, requester_address: str) -> bytes:
        return Web3.solidity_keccak(
            ["address", "address"],
            [_normalize_address(requester_address), _normalize_address(user_address)],
        )
