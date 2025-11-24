import hashlib
import random
import string
import time
from typing import Dict, Optional, Tuple

class IdentityVerification:
    def __init__(self, otp_ttl_seconds: int = 600):
        self.otp_ttl = otp_ttl_seconds
        self._otp_store: Dict[str, Tuple[str, float]] = {}
        self._verifications: Dict[str, Dict[str, str]] = {}

# Normalize Ethereum address to lowercase and make sure it starts with '0x'
    def _normalize(self, address: str) -> str:
        addr = address.lower()
        if not addr.startswith("0x") or len(addr) != 42:
            raise ValueError("Invalid address")
        return addr

# Generate a 6-digit OTP for a given email address and store it with an expiration time
    def generate_email_otp(self, address: str) -> str:
        addr = self._normalize(address)
        otp = "".join(random.choices(string.digits, k=6))
        self._otp_store[addr] = (otp, time.time() + self.otp_ttl)
        return otp  

# Verify the OTP and hash it if successful
    def verify_email_otp(self, address: str, otp: str) -> bool:
        addr = self._normalize(address)
        record = self._otp_store.get(addr)
        if not record:
            return False
        expected, expires_at = record
        if time.time() > expires_at or otp != expected:
            return False
        email_hash = hashlib.sha256(otp.encode()).hexdigest()
        self._verifications.setdefault(addr, {})["email_hash"] = email_hash
        del self._otp_store[addr]
        return True

# Hash and store the national ID
    def record_national_id(self, address: str, id_number: str) -> str:
        addr = self._normalize(address)
        id_hash = hashlib.sha256(id_number.encode()).hexdigest()
        self._verifications.setdefault(addr, {})["national_id_hash"] = id_hash
        return id_hash

    def is_verified(self, address: str) -> bool:
        addr = self._normalize(address)
        data = self._verifications.get(addr, {})
        return "email_hash" in data and "national_id_hash" in data

    def get_verification(self, address: str) -> Dict[str, str]:
        return self._verifications.get(self._normalize(address), {})
