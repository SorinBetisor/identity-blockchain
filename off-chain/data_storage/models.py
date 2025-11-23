"""
Data models for off-chain financial data storage.
These models correspond to the TypeScript types in models/FinancialData.ts
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Literal
from enum import Enum


class AssetType(str, Enum):
    """Asset type enumeration"""
    SAVINGS = "savings"
    CHECKING = "checking"
    INVESTMENT = "investment"
    PROPERTY = "property"
    VEHICLE = "vehicle"
    OTHER = "other"


class LiabilityType(str, Enum):
    """Liability type enumeration"""
    CREDIT_CARD = "credit_card"
    MORTGAGE = "mortgage"
    AUTO_LOAN = "auto_loan"
    PERSONAL_LOAN = "personal_loan"
    STUDENT_LOAN = "student_loan"
    OTHER = "other"


@dataclass
class Asset:
    """Individual asset entry"""
    assetID: str
    assetType: AssetType
    value: float  # In base currency units
    ownershipPercentage: float = 100.0  # 0-100
    lastUpdated: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    metadata: Optional[dict] = None

    def __post_init__(self):
        """Validate asset data"""
        if not 0 <= self.ownershipPercentage <= 100:
            raise ValueError("ownershipPercentage must be between 0 and 100")
        if self.value < 0:
            raise ValueError("value must be non-negative")

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "assetID": self.assetID,
            "assetType": self.assetType.value,
            "value": self.value,
            "ownershipPercentage": self.ownershipPercentage,
            "lastUpdated": self.lastUpdated,
            **({"metadata": self.metadata} if self.metadata else {})
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Asset":
        """Create Asset from dictionary"""
        return cls(
            assetID=data["assetID"],
            assetType=AssetType(data["assetType"]),
            value=data["value"],
            ownershipPercentage=data.get("ownershipPercentage", 100.0),
            lastUpdated=data.get("lastUpdated", datetime.utcnow().isoformat() + "Z"),
            metadata=data.get("metadata")
        )


@dataclass
class Liability:
    """Individual liability entry"""
    liabilityID: str
    liabilityType: LiabilityType
    amount: float  # Outstanding balance in base currency units
    interestRate: float  # Annual interest rate as percentage (0-100)
    monthlyPayment: float  # Monthly payment amount
    lastUpdated: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    metadata: Optional[dict] = None

    def __post_init__(self):
        """Validate liability data"""
        if not 0 <= self.interestRate <= 100:
            raise ValueError("interestRate must be between 0 and 100")
        if self.amount < 0:
            raise ValueError("amount must be non-negative")
        if self.monthlyPayment < 0:
            raise ValueError("monthlyPayment must be non-negative")

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "liabilityID": self.liabilityID,
            "liabilityType": self.liabilityType.value,
            "amount": self.amount,
            "interestRate": self.interestRate,
            "monthlyPayment": self.monthlyPayment,
            "dueDate": self.dueDate,
            "isOverdue": self.isOverdue,
            "lastUpdated": self.lastUpdated,
            **({"metadata": self.metadata} if self.metadata else {})
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Liability":
        """Create Liability from dictionary"""
        return cls(
            liabilityID=data["liabilityID"],
            liabilityType=LiabilityType(data["liabilityType"]),
            amount=data["amount"],
            interestRate=data["interestRate"],
            monthlyPayment=data["monthlyPayment"],
            dueDate=data["dueDate"],
            isOverdue=data.get("isOverdue", False),
            lastUpdated=data.get("lastUpdated", datetime.utcnow().isoformat() + "Z"),
            metadata=data.get("metadata")
        )


@dataclass
class FinancialData:
    """Complete financial data structure (assets and liabilities)"""
    userDID: str  # Ethereum address (0x...)
    assets: list[Asset] = field(default_factory=list)
    liabilities: list[Liability] = field(default_factory=list)
    lastUpdated: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    metadata: Optional[dict] = None

    def __post_init__(self):
        """Validate userDID format"""
        if not self.userDID.startswith("0x") or len(self.userDID) != 42:
            raise ValueError("userDID must be a valid Ethereum address (0x...)")

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "userDID": self.userDID,
            "assets": [asset.to_dict() for asset in self.assets],
            "liabilities": [liability.to_dict() for liability in self.liabilities],
            "lastUpdated": self.lastUpdated,
            **({"metadata": self.metadata} if self.metadata else {})
        }

    @classmethod
    def from_dict(cls, data: dict) -> "FinancialData":
        """Create FinancialData from dictionary"""
        return cls(
            userDID=data["userDID"],
            assets=[Asset.from_dict(asset_data) for asset_data in data.get("assets", [])],
            liabilities=[Liability.from_dict(liab_data) for liab_data in data.get("liabilities", [])],
            lastUpdated=data.get("lastUpdated", datetime.utcnow().isoformat() + "Z"),
            metadata=data.get("metadata")
        )

    def calculate_total_assets(self) -> float:
        """Calculate total value of all assets"""
        return sum(asset.value * (asset.ownershipPercentage / 100) for asset in self.assets)

    def calculate_total_liabilities(self) -> float:
        """Calculate total outstanding liabilities"""
        return sum(liability.amount for liability in self.liabilities)

    def calculate_net_worth(self) -> float:
        """(simplified) net worth (total assets - total liabilities)"""
        return self.calculate_total_assets() - self.calculate_total_liabilities()

