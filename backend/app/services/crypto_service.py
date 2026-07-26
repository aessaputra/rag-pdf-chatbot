import base64
import binascii
import hashlib
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings

NONCE_SIZE_BYTES = 12
TAG_SIZE_BYTES = 16
MIN_PAYLOAD_BYTES = NONCE_SIZE_BYTES + TAG_SIZE_BYTES


class CryptoService:
    def __init__(self, secret_key: str | None = None):
        key_material = secret_key if secret_key is not None else settings.SETTINGS_ENCRYPTION_KEY
        self.key = hashlib.sha256(key_material.encode("utf-8")).digest()
        self.aesgcm = AESGCM(self.key)

    def encrypt(self, plaintext: str) -> str:
        if not plaintext:
            return ""

        nonce = os.urandom(NONCE_SIZE_BYTES)
        ciphertext = self.aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        combined = nonce + ciphertext
        return base64.b64encode(combined).decode("utf-8")

    def decrypt(self, ciphertext_b64: str) -> str:
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
        if not api_key:
            return ""
        if len(api_key) <= 4:
            return "••••"
        return f"••••{api_key[-4:]}"


def get_crypto_service() -> CryptoService:
    return CryptoService()

