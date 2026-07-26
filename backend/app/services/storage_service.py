import logging

from app.database import get_supabase_client, maybe_await_call

logger = logging.getLogger(__name__)

STORAGE_BUCKET = "documents"
SIGNED_URL_EXPIRY_SECONDS = 3600


class StorageService:
    @staticmethod
    def build_storage_path(user_id: str, document_id: str) -> str:
        return f"{user_id}/{document_id}.pdf"

    @staticmethod
    async def upload_file(user_id: str, document_id: str, file_bytes: bytes) -> str:
        supabase = await get_supabase_client()
        file_path = StorageService.build_storage_path(user_id, document_id)

        response = await maybe_await_call(
            supabase.storage.from_(STORAGE_BUCKET).upload,
            file_path,
            file_bytes,
            file_options={"content-type": "application/pdf"},
        )

        if hasattr(response, "path") and response.path:
            logger.info("Uploaded PDF to storage: %s", file_path)
            return file_path

        logger.info("Uploaded PDF to storage: %s", file_path)
        return file_path

    @staticmethod
    async def delete_file(file_path: str) -> None:
        supabase = await get_supabase_client()
        try:
            await maybe_await_call(supabase.storage.from_(STORAGE_BUCKET).remove, [file_path])
            logger.info("Deleted file from storage: %s", file_path)
        except Exception as e:
            logger.error("Failed to delete file from storage %s: %s", file_path, e)
            raise

    @staticmethod
    async def create_signed_url(file_path: str, expires_in: int = SIGNED_URL_EXPIRY_SECONDS) -> str | None:
        supabase = await get_supabase_client()
        try:
            response = await maybe_await_call(
                supabase.storage.from_(STORAGE_BUCKET).create_signed_url,
                path=file_path,
                expires_in=expires_in,
            )
            if isinstance(response, dict) and response.get("signedURL"):
                return response["signedURL"]
            if hasattr(response, "signed_url"):
                return response.signed_url
            return response.get("signedURL") if isinstance(response, dict) else None
        except Exception as e:
            logger.error("Failed to create signed URL for %s: %s", file_path, e)
            return None
