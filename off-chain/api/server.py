import os
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from web3 import Web3

# Allow imports from off-chain submodules despite hyphenated parent folder
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR))

from data_services.data_sharing_client import (  # type: ignore  # noqa: E402
    CREDIT_TIERS,
    INCOME_BANDS,
    DataSharingClient,
)
from data_storage import Asset, FinancialData, Liability, LiabilityType, AssetType  # type: ignore  # noqa: E402


def get_web3() -> Web3:
    rpc = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    return Web3(Web3.HTTPProvider(rpc))


def new_client() -> DataSharingClient:
    return DataSharingClient(web3=get_web3())


class AssetInput(BaseModel):
    assetID: str
    assetType: AssetType
    value: float
    ownershipPercentage: float = 100.0
    metadata: Optional[Dict[str, Any]] = None


class LiabilityInput(BaseModel):
    liabilityID: str
    liabilityType: LiabilityType
    amount: float
    interestRate: float
    monthlyPayment: float
    dueDate: str
    isOverdue: bool = False
    metadata: Optional[Dict[str, Any]] = None


class FinancialDataInput(BaseModel):
    userDID: str
    assets: List[AssetInput] = Field(default_factory=list)
    liabilities: List[LiabilityInput] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None


class SaveFinancialRequest(BaseModel):
    userPrivateKey: str
    financialData: FinancialDataInput
    annualIncome: Optional[float] = None
    totalCreditLimit: Optional[float] = None
    validatorPrivateKey: Optional[str] = None
    validatorImpersonate: bool = True


class ConsentRequest(BaseModel):
    userPrivateKey: str
    requesterAddress: str
    daysValid: int = 30


class BrokerRequest(BaseModel):
    requesterPrivateKey: str
    ownerAddress: str


class ValidatorUpdateRequest(BaseModel):
    userDID: str
    annualIncome: Optional[float] = None
    totalCreditLimit: Optional[float] = None
    validatorPrivateKey: Optional[str] = None
    validatorImpersonate: bool = True


class OwnershipSignRequest(BaseModel):
    privateKey: str
    message: str


class OwnershipVerifyRequest(BaseModel):
    userAddress: str
    message: str
    signature: str


class UserDirectoryRegister(BaseModel):
    username: str
    userAddress: str


class FinancialFetchRequest(BaseModel):
    requesterAddress: str
    usernameOrAddress: str


app = FastAPI(title="Identity Off-Chain API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def to_financial_model(payload: FinancialDataInput) -> FinancialData:
    assets = [
        Asset(
            assetID=a.assetID,
            assetType=a.assetType,
            value=a.value,
            ownershipPercentage=a.ownershipPercentage,
            metadata=a.metadata,
        )
        for a in payload.assets
    ]
    liabilities = [
        Liability(
            liabilityID=l.liabilityID,
            liabilityType=l.liabilityType,
            amount=l.amount,
            interestRate=l.interestRate,
            monthlyPayment=l.monthlyPayment,
            dueDate=l.dueDate,
            isOverdue=l.isOverdue,
            metadata=l.metadata,
        )
        for l in payload.liabilities
    ]
    return FinancialData(
        userDID=payload.userDID,
        assets=assets,
        liabilities=liabilities,
        metadata=payload.metadata,
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/identity/{user_address}")
def get_identity(user_address: str):
    client = new_client()
    return client.get_identity(user_address)


@app.post("/identity/register")
def register_identity(body: Dict[str, str]):
    pk = body.get("privateKey")
    if not pk:
        raise HTTPException(status_code=400, detail="privateKey is required")
    client = new_client()
    receipt = client.register_identity(pk)
    return {"transactionHash": receipt.transactionHash.hex(), "blockNumber": receipt.blockNumber}


@app.post("/financial/save")
def save_financial_data(request: SaveFinancialRequest):
    client = new_client()
    financial_model = to_financial_model(request.financialData)

    derived_address = Web3.to_checksum_address(Web3().eth.account.from_key(request.userPrivateKey).address)
    if financial_model.userDID.lower() != derived_address.lower():
        raise HTTPException(status_code=400, detail="userDID must match userPrivateKey address")

    result = client.save_financial_profile(
        financial_data=financial_model,
        user_private_key=request.userPrivateKey,
        validator_private_key=request.validatorPrivateKey,
        annual_income=request.annualIncome,
        total_credit_limit=request.totalCreditLimit,
    )

    if request.validatorPrivateKey is None and request.validatorImpersonate:
        validator_addr = client.contracts.identity_registry.functions.validator().call()
        try:
            result["updateProfileReceipt"] = client.validator_update_profile_impersonated(
                financial_data=financial_model,
                validator_address=validator_addr,
                annual_income=request.annualIncome,
                total_credit_limit=request.totalCreditLimit,
            )["updateProfileReceipt"]
        except Exception as exc:  # pragma: no cover - dev path
            result["updateProfileError"] = str(exc)

    # Pydantic cannot serialize dataclass directly
    result["summary"] = asdict(result["summary"])
    if result.get("updateProfileReceipt"):
        receipt = result["updateProfileReceipt"]
        result["updateProfileReceipt"] = {
            "transactionHash": receipt.transactionHash.hex(),
            "blockNumber": receipt.blockNumber,
        }
    result["updateDataPointerReceipt"] = {
        "transactionHash": result["updateDataPointerReceipt"].transactionHash.hex(),
        "blockNumber": result["updateDataPointerReceipt"].blockNumber,
    }
    return result


@app.post("/validator/update-profile")
def validator_update_profile(request: ValidatorUpdateRequest):
    client = new_client()
    financial_data = client.storage.load(request.userDID)
    if financial_data is None:
        raise HTTPException(status_code=404, detail="No stored financial data")

    if request.validatorPrivateKey:
        result = client.validator_update_profile(
            financial_data=financial_data,
            validator_private_key=request.validatorPrivateKey,
            annual_income=request.annualIncome,
            total_credit_limit=request.totalCreditLimit,
        )
    elif request.validatorImpersonate:
        validator_addr = client.contracts.identity_registry.functions.validator().call()
        result = client.validator_update_profile_impersonated(
            financial_data=financial_data,
            validator_address=validator_addr,
            annual_income=request.annualIncome,
            total_credit_limit=request.totalCreditLimit,
        )
    else:
        raise HTTPException(status_code=400, detail="validatorPrivateKey or validatorImpersonate required")

    result["summary"] = asdict(result["summary"])
    receipt = result["updateProfileReceipt"]
    result["updateProfileReceipt"] = {
        "transactionHash": receipt.transactionHash.hex(),
        "blockNumber": receipt.blockNumber,
    }
    return result


@app.get("/integrity/{user_address}")
def integrity_check(user_address: str):
    client = new_client()
    return {"valid": client.verify_data_integrity(user_address)}


@app.post("/consent/grant")
def grant_consent(request: ConsentRequest):
    client = new_client()
    start = int(client.w3.eth.get_block("latest")["timestamp"])
    end = start + request.daysValid * 24 * 60 * 60
    create_receipt = client.create_consent(
        user_private_key=request.userPrivateKey,
        requester_address=request.requesterAddress,
        start_date=start,
        end_date=end,
    )
    grant_receipt = client.grant_consent(request.userPrivateKey, request.requesterAddress)
    return {
        "createTx": create_receipt.transactionHash.hex(),
        "grantTx": grant_receipt.transactionHash.hex(),
    }


@app.post("/consent/revoke")
def revoke_consent(request: ConsentRequest):
    client = new_client()
    receipt = client.revoke_consent(request.userPrivateKey, request.requesterAddress)
    return {"tx": receipt.transactionHash.hex()}


@app.get("/consent/status")
def consent_status(user_address: str, requester_address: str):
    client = new_client()
    return {"granted": client.is_consent_granted(user_address, requester_address)}


@app.post("/ownership/sign")
def sign_message(request: OwnershipSignRequest):
    client = new_client()
    signature = client.sign_ownership_challenge(request.privateKey, request.message)
    return {"signature": signature}


@app.post("/ownership/verify")
def verify_message(request: OwnershipVerifyRequest):
    client = new_client()
    ok = client.verify_address_ownership(request.userAddress, request.message, request.signature)
    return {"valid": ok}


@app.post("/broker/credit-tier")
def broker_credit(request: BrokerRequest):
    client = new_client()
    result = client.request_credit_tier(request.requesterPrivateKey, request.ownerAddress)
    return {
        "value": result["value"],
        "label": result["label"],
        "tx": result["receipt"].transactionHash.hex(),
        "rewardEvents": [dict(e["args"]) for e in result["rewardEvents"]],
    }


@app.post("/broker/income-band")
def broker_income(request: BrokerRequest):
    client = new_client()
    result = client.request_income_band(request.requesterPrivateKey, request.ownerAddress)
    return {
        "value": result["value"],
        "label": result["label"],
        "tx": result["receipt"].transactionHash.hex(),
        "rewardEvents": [dict(e["args"]) for e in result["rewardEvents"]],
    }


@app.post("/user-directory/register")
def directory_register(request: UserDirectoryRegister):
    client = new_client()
    ok = client.user_directory.register_username(request.username, request.userAddress)
    if not ok:
        raise HTTPException(status_code=400, detail="Username already taken")
    return {"ok": True}


@app.post("/financial/fetch")
def fetch_financial(request: FinancialFetchRequest):
    client = new_client()
    data = client.request_financial_file_with_consent(request.usernameOrAddress, request.requesterAddress)
    if data is None:
        raise HTTPException(status_code=404, detail="No data found or consent denied")
    return data.to_dict()


@app.get("/lookups")
def lookups():
    return {"creditTiers": CREDIT_TIERS, "incomeBands": INCOME_BANDS}


def run():
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))


if __name__ == "__main__":
    run()
