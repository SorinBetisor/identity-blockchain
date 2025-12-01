"""
Consent-based Data Access Service
Handles data retrieval with consent verification through smart contracts
"""

from typing import Optional
from web3 import Web3
from pathlib import Path
import json

import sys
sys.path.append(str(Path(__file__).parent.parent))

from data_storage import FinancialDataStorage, FinancialData, UserDirectory


class ConsentDataService:
    """
    Service for accessing financial data with consent verification
    """

    def __init__(
        self,
        web3_provider: Web3,
        consent_manager_address: str,
        consent_manager_abi: list,
        storage: FinancialDataStorage,
        user_directory: UserDirectory
    ):
        """
        Initialize consent data service
        
        Args:
            web3_provider: Web3 instance connected to blockchain
            consent_manager_address: Address of ConsentManager contract
            consent_manager_abi: ABI of ConsentManager contract
            storage: FinancialDataStorage instance
            user_directory: UserDirectory instance
        """
        self.w3 = web3_provider
        self.consent_manager = self.w3.eth.contract(
            address=consent_manager_address,
            abi=consent_manager_abi
        )
        self.storage = storage
        self.user_directory = user_directory

    def request_data_by_username(
        self,
        username: str,
        requester_address: str
    ) -> Optional[FinancialData]:
        """
        Request financial data using username (requires consent)
        
        Args:
            username: Username of the data owner
            requester_address: Ethereum address of the requester
            
        Returns:
            FinancialData if consent is granted, None otherwise
        """
        user_address = self.user_directory.get_address(username)
        
        if user_address is None:
            raise ValueError(f"Username '{username}' not found")
        
        if not self._check_consent(user_address, requester_address):
            raise PermissionError(
                f"Requester {requester_address} does not have consent from user '{username}'"
            )
        
        return self.storage.load(user_address)

    def request_data_by_address(
        self,
        user_address: str,
        requester_address: str
    ) -> Optional[FinancialData]:
        """
        Request financial data using Ethereum address (requires consent)
        
        Args:
            user_address: Ethereum address of the data owner
            requester_address: Ethereum address of the requester
            
        Returns:
            FinancialData if consent is granted, None otherwise
        """
        if not self._check_consent(user_address, requester_address):
            raise PermissionError(
                f"Requester {requester_address} does not have consent from {user_address}"
            )
        
        return self.storage.load(user_address)

    def _check_consent(self, user_address: str, requester_address: str) -> bool:
        """
        Check if consent is granted on-chain
        
        Args:
            user_address: Address of the user (data owner)
            requester_address: Address of the requester
            
        Returns:
            True if consent is granted, False otherwise
        """
        try:
            is_granted = self.consent_manager.functions.isConsentGranted(
                self.w3.to_checksum_address(user_address),
                self.w3.to_checksum_address(requester_address)
            ).call()
            
            return is_granted
        except Exception as e:
            print(f"Error checking consent: {e}")
            return False

    def get_consent_status(
        self,
        username: str,
        requester_address: str
    ) -> dict:
        """
        Get detailed consent status for a requester
        
        Args:
            username: Username of the data owner
            requester_address: Ethereum address of the requester
            
        Returns:
            Dictionary with consent status details
        """
        user_address = self.user_directory.get_address(username)
        
        if user_address is None:
            return {
                "found": False,
                "error": f"Username '{username}' not found"
            }
        
        try:
            consent_id = self.w3.solidity_keccak(
                ['address', 'address'],
                [requester_address, user_address]
            )
            
            consent = self.consent_manager.functions.consents(
                self.w3.to_checksum_address(user_address),
                consent_id
            ).call()
            
            status_map = {
                0: "None",
                1: "Granted",
                2: "Requested",
                3: "Revoked",
                4: "Expired"
            }
            
            return {
                "found": True,
                "username": username,
                "userAddress": user_address,
                "requesterAddress": requester_address,
                "consentID": "0x" + consent_id.hex(),
                "status": status_map.get(consent[2], "Unknown"),
                "startDate": consent[3],
                "endDate": consent[4],
                "isGranted": consent[2] == 1
            }
        except Exception as e:
            return {
                "found": True,
                "username": username,
                "userAddress": user_address,
                "error": str(e)
            }

    def list_user_consents(self, username: str) -> dict:
        """
        List all consent information for a user
        Note: This requires event indexing or tracking consent IDs off-chain
        
        Args:
            username: Username of the data owner
            
        Returns:
            Dictionary with user info and consent status
        """
        user_address = self.user_directory.get_address(username)
        
        if user_address is None:
            return {
                "found": False,
                "error": f"Username '{username}' not found"
            }
        
        return {
            "found": True,
            "username": username,
            "userAddress": user_address,
            "note": "Full consent listing requires event indexing. Use get_consent_status() for specific requesters."
        }

    def create_consent_request(
        self,
        username: str,
        requester_address: str,
        requester_private_key: str,
        start_date: int,
        end_date: int
    ) -> dict:
        """
        Create a consent request on-chain (WRITE operation)
        
        Args:
            username: Username of the data owner
            requester_address: Ethereum address of the requester
            requester_private_key: Private key to sign the transaction
            start_date: Unix timestamp for consent start
            end_date: Unix timestamp for consent end
            
        Returns:
            Transaction receipt
        """
        user_address = self.user_directory.get_address(username)
        
        if user_address is None:
            raise ValueError(f"Username '{username}' not found")
        
        try:
            nonce = self.w3.eth.get_transaction_count(requester_address)
            
            transaction = self.consent_manager.functions.createConsent(
                self.w3.to_checksum_address(requester_address),
                self.w3.to_checksum_address(user_address),
                start_date,
                end_date
            ).build_transaction({
                'from': self.w3.to_checksum_address(user_address),
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            signed_txn = self.w3.eth.account.sign_transaction(
                transaction,
                requester_private_key
            )
            
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            return {
                "success": True,
                "transactionHash": receipt['transactionHash'].hex(),
                "blockNumber": receipt['blockNumber'],
                "gasUsed": receipt['gasUsed']
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def grant_consent(
        self,
        username: str,
        user_private_key: str,
        requester_address: str
    ) -> dict:
        """
        Grant consent for a requester (USER action - WRITE operation)
        
        Args:
            username: Username of the data owner (must match private key)
            user_private_key: Private key of the user to sign transaction
            requester_address: Address of the requester to grant consent to
            
        Returns:
            Transaction receipt
        """
        user_address = self.user_directory.get_address(username)
        
        if user_address is None:
            raise ValueError(f"Username '{username}' not found")
        
        try:
            consent_id = self.w3.solidity_keccak(
                ['address', 'address'],
                [requester_address, user_address]
            )
            
            nonce = self.w3.eth.get_transaction_count(user_address)
            
            transaction = self.consent_manager.functions.changeStatus(
                self.w3.to_checksum_address(user_address),
                consent_id,
                1
            ).build_transaction({
                'from': self.w3.to_checksum_address(user_address),
                'nonce': nonce,
                'gas': 100000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            # Sign and send
            signed_txn = self.w3.eth.account.sign_transaction(
                transaction,
                user_private_key
            )
            
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            return {
                "success": True,
                "transactionHash": receipt['transactionHash'].hex(),
                "blockNumber": receipt['blockNumber'],
                "gasUsed": receipt['gasUsed'],
                "consentID": "0x" + consent_id.hex()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
