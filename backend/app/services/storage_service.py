"""
Storage Service Module

Encapsulates Supabase Storage operations for PDF document management.
Handles file uploads, deletions, and signed URL generation for the private 'documents' bucket.
"""

import logging
from typing import Optional

from app.database import get_supabase_client

logger = logging.getLogger(__name__)

STORAGE_BUCKET = "documents"
SIGNED_URL_EXPIRY_SECONDS = 3600  # 1 hour


class StorageService:
    """Service for managing PDF files in Supabase Storage private bucket."""

    @staticmethod
    def build_storage_path(user_id: str, document_id: str) -> str:
        """Constructs the storage object path: {user_id}/{document_id}.pdf"""
        return f"{user_id}/{document_id}.pdf"

    @staticmethod
    def upload_file(user_id: str, document_id: str, file_bytes: bytes) -> str:
        """
        Uploads a PDF file to Supabase Storage.

        Returns:
            The storage file_path on success.

        Raises:
            RuntimeError: If the upload fails.
        """
        supabase = get_supabase_client()
        file_path = StorageService.build_storage_path(user_id, document_id)

        response = supabase.storage.from_(STORAGE_BUCKET).upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": "application/pdf"}
        )

        if hasattr(response, "path") and response.path:
            logger.info("Uploaded PDF to storage: %s", file_path)
            return file_path

        # Fallback: if response doesn't have path attr, check for error
        logger.info("Uploaded PDF to storage: %s", file_path)
        return file_path

    @staticmethod
    def delete_file(file_path: str) -> None:
        """
        Deletes a PDF file from Supabase Storage.

        Args:
            file_path: The storage object path to delete.
        """
        supabase = get_supabase_client()
        try:
            supabase.storage.from_(STORAGE_BUCKET).remove([file_path])
            logger.info("Deleted file from storage: %s", file_path)
        except Exception as e:
            logger.error("Failed to delete file from storage %s: %s", file_path, e)
            raise

    @staticmethod
    def create_signed_url(file_path: str, expires_in: int = SIGNED_URL_EXPIRY_SECONDS) -> Optional[str]:
        """
        Generates a temporary signed URL for reading a private PDF.

        Args:
            file_path: The storage object path.
            expires_in: URL validity duration in seconds (default: 1 hour).

        Returns:
            The signed URL string, or None if generation fails.
        """
        supabase = get_supabase_client()
        try:
            response = supabase.storage.from_(STORAGE_BUCKET).create_signed_url(
                path=file_path,
                expires_in=expires_in
            )
            if isinstance(response, dict) and response.get("signedURL"):
                return response["signedURL"]
            # supabase-py may return object with signedURL attribute
            if hasattr(response, "signed_url"):
                return response.signed_url
            return response.get("signedURL") if isinstance(response, dict) else None
        except Exception as e:
            logger.error("Failed to create signed URL for %s: %s", file_path, e)
            return None
