"""
User Directory Service - Maps usernames to Ethereum addresses
Allows requesters to look up users by username without exposing addresses directly.
"""

import json
from pathlib import Path
from typing import Optional
import hashlib


class UserDirectory:
    """
    Manages username-to-address mappings for privacy-preserving lookups
    """

    def __init__(self, data_dir: str = "data"):
        """
        Initialize user directory
        
        Args:
            data_dir: Directory to store user directory file
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.directory_file = self.data_dir / "user_directory.json"
        
        self._load_directory()

    def _load_directory(self):
        """Load directory from file"""
        if self.directory_file.exists():
            with open(self.directory_file, 'r') as f:
                data = json.load(f)
                self.username_to_address = data.get("username_to_address", {})
                self.address_to_username = data.get("address_to_username", {})
        else:
            self.username_to_address = {}
            self.address_to_username = {}

    def _save_directory(self):
        """Save directory to file"""
        with open(self.directory_file, 'w') as f:
            json.dump({
                "username_to_address": self.username_to_address,
                "address_to_username": self.address_to_username
            }, f, indent=2)

    def register_username(self, username: str, user_address: str) -> bool:
        """
        Register a username for a user address
        
        Args:
            username: Unique username (case-insensitive)
            user_address: Ethereum address (0x...)
            
        Returns:
            True if registration successful, False if username already taken
        """
        username_lower = username.lower()
        
        if username_lower in self.username_to_address:
            return False
        
        if not user_address.startswith("0x") or len(user_address) != 42:
            raise ValueError("Invalid Ethereum address format")
        
        self.username_to_address[username_lower] = user_address
        self.address_to_username[user_address.lower()] = username_lower
        
        self._save_directory()
        return True

    def get_address(self, username: str) -> Optional[str]:
        """
        Get Ethereum address for a username
        
        Args:
            username: Username to lookup
            
        Returns:
            Ethereum address or None if not found
        """
        return self.username_to_address.get(username.lower())

    def get_username(self, user_address: str) -> Optional[str]:
        """
        Get username for an Ethereum address
        
        Args:
            user_address: Ethereum address
            
        Returns:
            Username or None if not found
        """
        return self.address_to_username.get(user_address.lower())

    def update_username(self, old_username: str, new_username: str) -> bool:
        """
        Update a user's username
        
        Args:
            old_username: Current username
            new_username: New username
            
        Returns:
            True if update successful, False if old username doesn't exist or new username is taken
        """
        old_lower = old_username.lower()
        new_lower = new_username.lower()
        
        if old_lower not in self.username_to_address:
            return False
        
        if new_lower in self.username_to_address and new_lower != old_lower:
            return False
        
        address = self.username_to_address[old_lower]
        
        del self.username_to_address[old_lower]
        self.username_to_address[new_lower] = address
        self.address_to_username[address.lower()] = new_lower
        
        self._save_directory()
        return True

    def unregister_username(self, username: str) -> bool:
        """
        Remove a username registration
        
        Args:
            username: Username to remove
            
        Returns:
            True if removal successful, False if username doesn't exist
        """
        username_lower = username.lower()
        
        if username_lower not in self.username_to_address:
            return False
        
        address = self.username_to_address[username_lower]
        
        del self.username_to_address[username_lower]
        del self.address_to_username[address.lower()]
        
        self._save_directory()
        return True

    def is_username_available(self, username: str) -> bool:
        """
        Check if a username is available
        
        Args:
            username: Username to check
            
        Returns:
            True if available, False if taken
        """
        return username.lower() not in self.username_to_address

    def generate_username_hash(self, username: str) -> str:
        """
        Generate a hash of the username for privacy-preserving requests
        Requesters can use this hash instead of storing/transmitting plaintext usernames
        
        Args:
            username: Username to hash
            
        Returns:
            Hex string of SHA-256 hash (0x...)
        """
        username_bytes = username.lower().encode('utf-8')
        hash_bytes = hashlib.sha256(username_bytes).digest()
        return "0x" + hash_bytes.hex()

    def list_all_usernames(self) -> list[str]:
        """
        List all registered usernames (admin function)
        
        Returns:
            List of all usernames
        """
        return list(self.username_to_address.keys())

    def get_user_count(self) -> int:
        """
        Get total number of registered users
        
        Returns:
            Count of registered users
        """
        return len(self.username_to_address)
