"""
Unit tests for CryptoService (AES-256-GCM encryption/decryption)
"""

import pytest

from app.services.crypto_service import CryptoService


def test_crypto_service_roundtrip():
    """Verifies that encrypting then decrypting returns original plaintext."""
    service = CryptoService(secret_key="my_super_secret_test_key_32_bytes")
    original_api_key = "sk-proj-1234567890abcdef-secret-llm-key"

    ciphertext = service.encrypt(original_api_key)
    assert ciphertext != original_api_key
    assert len(ciphertext) > 0

    decrypted = service.decrypt(ciphertext)
    assert decrypted == original_api_key


def test_crypto_service_different_nonces():
    """Verifies that encrypting the same text twice yields different ciphertexts (random nonce)."""
    service = CryptoService(secret_key="test_key")
    text = "gemini-api-key-value"

    enc1 = service.encrypt(text)
    enc2 = service.encrypt(text)

    assert enc1 != enc2
    assert service.decrypt(enc1) == text
    assert service.decrypt(enc2) == text


def test_crypto_service_tampered_ciphertext():
    """Verifies that tampered or invalid ciphertext raises ValueError."""
    service = CryptoService(secret_key="test_key")
    ciphertext = service.encrypt("secret_data")

    # Corrupt last character of base64
    tampered = ciphertext[:-2] + ("00" if ciphertext[-2:] != "00" else "11")

    with pytest.raises(ValueError, match="Decryption failed"):
        service.decrypt(tampered)


def test_crypto_service_wrong_key():
    """Verifies that decrypting with a different secret key fails."""
    service_a = CryptoService(secret_key="key_alpha_123")
    service_b = CryptoService(secret_key="key_beta_456")

    ciphertext = service_a.encrypt("my_private_key")

    with pytest.raises(ValueError, match="Decryption failed"):
        service_b.decrypt(ciphertext)


def test_crypto_service_mask_api_key():
    """Verifies API key masking behavior."""
    assert CryptoService.mask_api_key("sk-123456789") == "••••6789"
    assert CryptoService.mask_api_key("abcd") == "••••"
    assert CryptoService.mask_api_key("ab") == "••••"
    assert CryptoService.mask_api_key("") == ""
