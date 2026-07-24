"""
Crypto Service Module

Provides AES-256-GCM symmetric encryption and decryption for BYOK user API keys.
Uses SHA-256 key derivation to map configured encryption secrets to valid 256-bit AES keys.
Follows Clean Code principles and FastAPI dependency injection practices.
"""

import base64
import binascii
import hashlib
import os
from typing import Optional
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings

# AES-GCM Cryptographic Constants
NONCE_SIZE_BYTES = 12  # Recommended 96-bit nonce length for AES-GCM
TAG_SIZE_BYTES = 16    # Default 128-bit authentication tag length
MIN_PAYLOAD_BYTES = NONCE_SIZE_BYTES + TAG_SIZE_BYTES  # 28 bytes minimum


class CryptoService:
    """Service managing AES-256-GCM encryption/decryption of sensitive user credentials."""

    def __init__(self, secret_key: Optional[str] = None):
        key_material = secret_key if secret_key is not None else settings.SETTINGS_ENCRYPTION_KEY
        # Derive fixed 32-byte key via SHA-256 hash of secret string
        self.key = hashlib.sha256(key_material.encode("utf-8")).digest()
        self.aesgcm = AESGCM(self.key)

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypts plaintext string into a base64-encoded string containing 12-byte nonce + payload.
        """
        if not plaintext:
            return ""

        nonce = os.urandom(NONCE_SIZE_BYTES)
        ciphertext = self.aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        combined = nonce + ciphertext
        return base64.b64encode(combined).decode("utf-8")

    def decrypt(self, ciphertext_b64: str) -> str:
        """
        Decrypts base64-encoded ciphertext string into original plaintext string.
        Raises ValueError if decryption fails or authentication tag is invalid.
        """
        if not ciphertext_b64:
            return ""

        try:
            combined = base64.b64decode(ciphertext_b64.encode("utf-8"))
            if len(combined) < MIN_PAYLOAD_BYTES:
                raise ValueError("Invalid ciphertext length: payload too short")

            nonce = combined[:NONCE_SIZE_BYTES]
            ciphertext = combined[NONCE_SIZE_BYTES:]
            plaintext_bytes = self.aesgcm.decrypt(nonce, ciphertext, None)
            return plaintext_bytes.decode("utf-8")
        except (InvalidTag, binascii.Error, ValueError) as exc:
            raise ValueError("Decryption failed: corrupted key or invalid payload") from exc

    @staticmethod
    def mask_api_key(api_key: str) -> str:
        """
        Returns masked representation of API key displaying only last 4 characters.
        Example: 'sk-123456789' -> '••••6789'
        """
        if not api_key:
            return ""
        if len(api_key) <= 4:
            return "••••"
        return f"••••{api_key[-4:]}"


def get_crypto_service() -> CryptoService:
    """FastAPI Dependency / Factory helper for CryptoService singleton."""
    return CryptoService()

