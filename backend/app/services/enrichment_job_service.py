import logging
from datetime import datetime, timezone
from typing import Any

from app.database import execute_query, get_supabase_client
from app.schemas import DocumentChunkDTO

logger = logging.getLogger(__name__)

PRESET_CAPS = {
    "off": 0,
    "standard": 75,
    "high": 150,
    "full": 999999,
}

DEFAULT_PRESET = "standard"
MIN_PARAGRAPH_LENGTH = 20


class EnrichmentJobService:
    def get_preset_cap(self, preset: str) -> int:
        return PRESET_CAPS.get(preset, PRESET_CAPS["standard"])

    async def get_user_preset(self, user_id: str) -> str:
        supabase = await get_supabase_client()
        result = await execute_query(
            supabase.table("user_enrichment_configs")
            .select("preset")
            .eq("user_id", user_id)
        )
        if result.data:
            return result.data[0].get("preset", DEFAULT_PRESET)
        return DEFAULT_PRESET

    async def create_job(
        self,
        document_id: str,
        user_id: str,
        total_paragraphs: int,
    ) -> dict[str, Any]:
        supabase = await get_supabase_client()
        job_data = {
            "document_id": document_id,
            "user_id": user_id,
            "status": "pending",
            "total_paragraphs": total_paragraphs,
            "processed_paragraphs": 0,
            "question_chunks_created": 0,
            "failed_paragraphs": 0,
            "attempt_count": 0,
        }
        result = await execute_query(
            supabase.table("document_enrichment_jobs").insert(job_data)
        )
        return result.data[0]

    async def get_job(self, document_id: str) -> dict[str, Any] | None:
        supabase = await get_supabase_client()
        result = await execute_query(
            supabase.table("document_enrichment_jobs")
            .select("*")
            .eq("document_id", document_id)
        )
        if result.data:
            return result.data[0]
        return None

    async def start_job(self, document_id: str, user_id: str) -> None:
        supabase = await get_supabase_client()
        await execute_query(
            supabase.table("document_enrichment_jobs")
            .update({"status": "running", "started_at": datetime.now(timezone.utc).isoformat()})
            .eq("document_id", document_id)
            .eq("user_id", user_id)
        )

    async def update_progress(
        self,
        document_id: str,
        user_id: str,
        processed_paragraphs: int,
        question_chunks_created: int,
    ) -> None:
        supabase = await get_supabase_client()
        await execute_query(
            supabase.table("document_enrichment_jobs")
            .update({
                "processed_paragraphs": processed_paragraphs,
                "question_chunks_created": question_chunks_created,
            })
            .eq("document_id", document_id)
            .eq("user_id", user_id)
        )

    async def complete_job(
        self,
        document_id: str,
        user_id: str,
        processed_paragraphs: int,
        question_chunks_created: int,
    ) -> None:
        supabase = await get_supabase_client()
        await execute_query(
            supabase.table("document_enrichment_jobs")
            .update({
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "processed_paragraphs": processed_paragraphs,
                "question_chunks_created": question_chunks_created,
            })
            .eq("document_id", document_id)
            .eq("user_id", user_id)
        )

    async def fail_job(
        self,
        document_id: str,
        user_id: str,
        error_message: str,
        failed_paragraphs: int = 0,
    ) -> None:
        supabase = await get_supabase_client()
        await execute_query(
            supabase.table("document_enrichment_jobs")
            .update({
                "status": "failed",
                "last_error": error_message,
                "failed_paragraphs": failed_paragraphs,
            })
            .eq("document_id", document_id)
            .eq("user_id", user_id)
        )

    async def get_retryable_jobs(self) -> list[dict[str, Any]]:
        supabase = await get_supabase_client()
        result = await execute_query(
            supabase.table("document_enrichment_jobs")
            .select("*")
            .eq("status", "failed")
            .lt("attempt_count", 3)
        )
        return result.data if result.data else []

    def select_paragraphs_by_quality(
        self,
        chunks: list[DocumentChunkDTO],
        cap: int,
        min_length: int = MIN_PARAGRAPH_LENGTH,
    ) -> list[DocumentChunkDTO]:
        paragraph_chunks = [
            chunk for chunk in chunks
            if chunk.metadata.get("type") == "paragraph"
            and len(chunk.content) >= min_length
        ]
        sorted_chunks = sorted(
            paragraph_chunks,
            key=lambda c: len(c.content),
            reverse=True,
        )
        return sorted_chunks[:cap]
