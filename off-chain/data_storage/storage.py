"""
Storage utilities for off-chain financial data.
Handles reading, writing, and hashing of financial data JSON files.

considerations:

1. Cost efficiency
   - Storing detailed financial data on-chain is expensive (gas).
   - Users may have many assets/liabilities.
   - Off-chain storage avoids per-update gas costs.

2. Privacy
   - Raw financial data stays private (encrypted locally).
   - Only summary data (creditTier, netWorth) goes on-chain.
   - Detailed breakdowns remain off-chain.

3. Data integrity
   - Hash of the JSON file is stored on-chain as dataPointer.
   - Any tampering with the file can be detected.
   - Blockchain verifies the file hasn't changed.
"""



import json
import os
from pathlib import Path
from typing import Optional
import hashlib
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

from .models import FinancialData, Asset, Liability


class FinancialDataStorage:
    """Handles storage and retrieval of financial data files"""

    def __init__(self, data_dir: str = "data", encrypted: bool = False, encryption_key: Optional[bytes] = None):
        """
        Initialize storage handler
        
        Args:
            data_dir: Directory to store financial data files
            encrypted: Whether to encrypt files before storage
            encryption_key: Optional encryption key (if None and encrypted=True, generates new key)
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.encrypted = encrypted
        self.encryption_key = encryption_key
        
        if encrypted and encryption_key is None:
            self.encryption_key = Fernet.generate_key()
            print(f"WARNING: Generated new encryption key. Store this securely: {base64.b64encode(self.encryption_key).decode()}")
        
        if encrypted:
            self.cipher = Fernet(self.encryption_key)

    def _get_file_path(self, user_did: str) -> Path:
        """Get file path for a user's financial data"""
        filename = user_did[2:] if user_did.startswith("0x") else user_did
        return self.data_dir / f"{filename}.json"

    def save(self, financial_data: FinancialData) -> bytes:
        """
        Save financial data to file and return its hash
        
        Args:
            financial_data: FinancialData object to save
            
        Returns:
            bytes32 hash of the saved data (for on-chain dataPointer)
        """
        file_path = self._get_file_path(financial_data.userDID)
        
        json_data = json.dumps(financial_data.to_dict(), indent=2)
        json_bytes = json_data.encode('utf-8')
        
        if self.encrypted:
            json_bytes = self.cipher.encrypt(json_bytes)
        
        with open(file_path, 'wb') as f:
            f.write(json_bytes)
        
        data_hash = hashlib.sha256(json_data.encode('utf-8')).digest()
        
        return data_hash

    def load(self, user_did: str) -> Optional[FinancialData]:
        """
        Load financial data from file
        
        Args:
            user_did: Ethereum address of the user
            
        Returns:
            FinancialData object or None if file doesn't exist
        """
        file_path = self._get_file_path(user_did)
        
        if not file_path.exists():
            return None
        
        with open(file_path, 'rb') as f:
            json_bytes = f.read()
        
        if self.encrypted:
            json_bytes = self.cipher.decrypt(json_bytes)
        
        json_data = json.loads(json_bytes.decode('utf-8'))
        
        return FinancialData.from_dict(json_data)

    def verify_hash(self, user_did: str, expected_hash: bytes) -> bool:
        """
        Verify that the stored file matches the expected hash
        
        Args:
            user_did: Ethereum address of the user
            expected_hash: Expected hash (from on-chain dataPointer)
            
        Returns:
            True if hash matches, False otherwise
        """
        file_path = self._get_file_path(user_did)
        
        if not file_path.exists():
            return False
        
        with open(file_path, 'rb') as f:
            json_bytes = f.read()
        
        if self.encrypted:
            json_bytes = self.cipher.decrypt(json_bytes)
        
        actual_hash = hashlib.sha256(json_bytes).digest()
        
        return actual_hash == expected_hash

    def calculate_file_hash(self, user_did: str) -> Optional[bytes]:
        """
        Calculate hash of stored file (for verification)
        
        Args:
            user_did: Ethereum address of the user
            
        Returns:
            SHA-256 hash of the file, or None if file doesn't exist
        """
        file_path = self._get_file_path(user_did)
        
        if not file_path.exists():
            return None
        
        with open(file_path, 'rb') as f:
            json_bytes = f.read()
        
        if self.encrypted:
            json_bytes = self.cipher.decrypt(json_bytes)
        
        return hashlib.sha256(json_bytes).digest()

    def delete(self, user_did: str) -> bool:
        """
        Delete financial data file
        
        Args:
            user_did: Ethereum address of the user
            
        Returns:
            True if file was deleted, False if it didn't exist
        """
        file_path = self._get_file_path(user_did)
        
        if file_path.exists():
            file_path.unlink()
            return True
        
        return False

    def add_asset(self, user_did: str, asset: Asset) -> bytes:
        """
        Add an asset to user's financial data
        
        Args:
            user_did: Ethereum address of the user
            asset: Asset to add
            
        Returns:
            Updated data hash
        """
        financial_data = self.load(user_did)
        
        if financial_data is None:
            financial_data = FinancialData(userDID=user_did)
        
        existing_index = next(
            (i for i, a in enumerate(financial_data.assets) if a.assetID == asset.assetID),
            None
        )
        
        if existing_index is not None:
            financial_data.assets[existing_index] = asset
        else:
            financial_data.assets.append(asset)
        
        return self.save(financial_data)

    def remove_asset(self, user_did: str, asset_id: str) -> Optional[bytes]:
        """
        Remove an asset from user's financial data
        
        Args:
            user_did: Ethereum address of the user
            asset_id: ID of asset to remove
            
        Returns:
            Updated data hash, or None if user/file doesn't exist
        """
        financial_data = self.load(user_did)
        
        if financial_data is None:
            return None
        
        financial_data.assets = [a for a in financial_data.assets if a.assetID != asset_id]
        
        return self.save(financial_data)

    def add_liability(self, user_did: str, liability: Liability) -> bytes:
        """
        Add a liability to user's financial data
        
        Args:
            user_did: Ethereum address of the user
            liability: Liability to add
            
        Returns:
            Updated data hash
        """
        financial_data = self.load(user_did)
        
        if financial_data is None:
            financial_data = FinancialData(userDID=user_did)
        
        existing_index = next(
            (i for i, l in enumerate(financial_data.liabilities) if l.liabilityID == liability.liabilityID),
            None
        )
        
        if existing_index is not None:
            financial_data.liabilities[existing_index] = liability
        else:
            financial_data.liabilities.append(liability)
        
        return self.save(financial_data)

    def remove_liability(self, user_did: str, liability_id: str) -> Optional[bytes]:
        """
        Remove a liability from user's financial data
        
        Args:
            user_did: Ethereum address of the user
            liability_id: ID of liability to remove
            
        Returns:
            Updated data hash, or None if user/file doesn't exist
        """
        financial_data = self.load(user_did)
        
        if financial_data is None:
            return None
        
        financial_data.liabilities = [l for l in financial_data.liabilities if l.liabilityID != liability_id]
        
        return self.save(financial_data)

