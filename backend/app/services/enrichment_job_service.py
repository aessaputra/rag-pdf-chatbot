import logging
import re
from typing import Any

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.database import execute_query, get_supabase_client
from app.exceptions import get_retryable_exceptions
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
UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)

JUNK_SECTION_TITLES = (
    "table of contents",
    "references",
    "bibliography",
    "index",
    "appendix",
)

ARGUMENTATIVE_CONJUNCTIONS = (
    "however",
    "therefore",
    "moreover",
    "furthermore",
    "consequently",
    "specifically",
    "particularly",
)


class EnrichmentJobService:
    @staticmethod
    def _validate_uuid(value: str, field_name: str) -> None:
        if not value or not isinstance(value, str):
            raise ValueError(f"{field_name} must be a non-empty string")
        if not UUID_PATTERN.match(value):
            raise ValueError(f"{field_name} must be a valid UUID")

    def get_preset_cap(self, preset: str) -> int:
        return PRESET_CAPS.get(preset, PRESET_CAPS["standard"])

    @retry(
        retry=retry_if_exception_type(get_retryable_exceptions()),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
    )
    async def get_user_preset(self, user_id: str) -> str:
        self._validate_uuid(user_id, "user_id")

        try:
            supabase = await get_supabase_client()
            result = await execute_query(
                supabase.table("user_enrichment_configs")
                .select("preset")
                .eq("user_id", user_id)
            )

            if result.data:
                preset = result.data[0].get("preset", DEFAULT_PRESET)
                logger.debug("Retrieved preset '%s' for user %s", preset, user_id)
                return preset

            logger.debug("No preset found for user %s, using default", user_id)
            return DEFAULT_PRESET

        except Exception as exc:
            logger.error("Failed to get user preset for %s: %s", user_id, exc)
            return DEFAULT_PRESET

    @retry(
        retry=retry_if_exception_type(get_retryable_exceptions()),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
    )
    async def create_job(
        self,
        document_id: str,
        user_id: str,
        total_paragraphs: int,
    ) -> dict[str, Any]:
        self._validate_uuid(document_id, "document_id")
        self._validate_uuid(user_id, "user_id")

        if total_paragraphs < 0:
            raise ValueError("total_paragraphs must be non-negative")

        try:
            supabase = await get_supabase_client()
            job_data: dict[str, Any] = {
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

            logger.info(
                "Created enrichment job for document %s (user %s, %d paragraphs)",
                document_id,
                user_id,
                total_paragraphs,
            )

            return result.data[0]

        except Exception as exc:
            logger.error(
                "Failed to create enrichment job for document %s: %s", document_id, exc
            )
            raise

    @retry(
        retry=retry_if_exception_type(get_retryable_exceptions()),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
    )
    async def get_job(self, document_id: str) -> dict[str, Any] | None:
        self._validate_uuid(document_id, "document_id")

        try:
            supabase = await get_supabase_client()
            result = await execute_query(
                supabase.table("document_enrichment_jobs")
                .select("*")
                .eq("document_id", document_id)
            )

            if result.data:
                return result.data[0]

            logger.debug("No enrichment job found for document %s", document_id)
            return None

        except Exception as exc:
            logger.error("Failed to get enrichment job for document %s: %s", document_id, exc)
            raise

    @retry(
        retry=retry_if_exception_type(get_retryable_exceptions()),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
    )
    async def start_job(self, document_id: str, user_id: str) -> None:
        self._validate_uuid(document_id, "document_id")
        self._validate_uuid(user_id, "user_id")

        try:
            supabase = await get_supabase_client()
            await execute_query(
                supabase.rpc(
                    "start_enrichment_job",
                    {"p_document_id": document_id},
                )
            )

            logger.info("Started enrichment job for document %s", document_id)

        except Exception as exc:
            logger.error("Failed to start enrichment job for document %s: %s", document_id, exc)
            raise

    @retry(
        retry=retry_if_exception_type(get_retryable_exceptions()),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
    )
    async def update_progress(
        self,
        document_id: str,
        user_id: str,
        processed_paragraphs: int,
        question_chunks_created: int,
    ) -> None:
        self._validate_uuid(document_id, "document_id")
        self._validate_uuid(user_id, "user_id")

        if processed_paragraphs < 0:
            raise ValueError("processed_paragraphs must be non-negative")
        if question_chunks_created < 0:
            raise ValueError("question_chunks_created must be non-negative")

        try:
            supabase = await get_supabase_client()
            await execute_query(
                supabase.table("document_enrichment_jobs")
                .update(
                    {
                        "processed_paragraphs": processed_paragraphs,
                        "question_chunks_created": question_chunks_created,
                    }
                )
                .eq("document_id", document_id)
                .eq("user_id", user_id)
            )

            logger.debug(
                "Updated progress for document %s: %d/%d paragraphs, %d questions",
                document_id,
                processed_paragraphs,
                question_chunks_created,
                question_chunks_created,
            )

        except Exception as exc:
            logger.warning(
                "Failed to update progress for document %s: %s", document_id, exc
            )

    @retry(
        retry=retry_if_exception_type(get_retryable_exceptions()),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
    )
    async def complete_job(
        self,
        document_id: str,
        user_id: str,
        processed_paragraphs: int,
        question_chunks_created: int,
    ) -> None:
        self._validate_uuid(document_id, "document_id")
        self._validate_uuid(user_id, "user_id")

        if processed_paragraphs < 0:
            raise ValueError("processed_paragraphs must be non-negative")
        if question_chunks_created < 0:
            raise ValueError("question_chunks_created must be non-negative")

        try:
            supabase = await get_supabase_client()
            await execute_query(
                supabase.rpc(
                    "complete_enrichment_job",
                    {
                        "p_document_id": document_id,
                        "p_processed_paragraphs": processed_paragraphs,
                        "p_question_chunks_created": question_chunks_created,
                    },
                )
            )

            logger.info(
                "Completed enrichment job for document %s: %d paragraphs, %d questions",
                document_id,
                processed_paragraphs,
                question_chunks_created,
            )

        except Exception as exc:
            logger.error(
                "Failed to complete enrichment job for document %s: %s", document_id, exc
            )
            raise

    @retry(
        retry=retry_if_exception_type(get_retryable_exceptions()),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
    )
    async def fail_job(
        self,
        document_id: str,
        user_id: str,
        error_message: str,
        failed_paragraphs: int = 0,
    ) -> None:
        self._validate_uuid(document_id, "document_id")
        self._validate_uuid(user_id, "user_id")

        if failed_paragraphs < 0:
            raise ValueError("failed_paragraphs must be non-negative")

        try:
            supabase = await get_supabase_client()
            await execute_query(
                supabase.table("document_enrichment_jobs")
                .update(
                    {
                        "status": "failed",
                        "last_error": error_message[:500],
                        "failed_paragraphs": failed_paragraphs,
                    }
                )
                .eq("document_id", document_id)
                .eq("user_id", user_id)
            )

            logger.error(
                "Marked enrichment job as failed for document %s: %s",
                document_id,
                error_message,
            )

        except Exception as exc:
            logger.error(
                "Failed to mark enrichment job as failed for document %s: %s",
                document_id,
                exc,
            )

    @retry(
        retry=retry_if_exception_type(get_retryable_exceptions()),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
    )
    async def get_retryable_jobs(self) -> list[dict[str, Any]]:
        try:
            supabase = await get_supabase_client()
            result = await execute_query(
                supabase.table("document_enrichment_jobs")
                .select("*")
                .eq("status", "failed")
                .lt("attempt_count", 3)
            )

            jobs = result.data if result.data else []
            logger.info("Found %d retryable enrichment jobs", len(jobs))
            return jobs

        except Exception as exc:
            logger.error("Failed to get retryable enrichment jobs: %s", exc)
            return []

    def select_paragraphs_by_quality(
        self,
        chunks: list[DocumentChunkDTO],
        cap: int,
        min_length: int = MIN_PARAGRAPH_LENGTH,
    ) -> list[DocumentChunkDTO]:
        if cap <= 0:
            return []

        paragraph_chunks = [
            chunk
            for chunk in chunks
            if chunk.metadata.get("type") == "paragraph"
            and len(chunk.content) >= min_length
            and self._is_quality_paragraph(chunk.content)
        ]

        scored_chunks = [
            (chunk, self._calculate_quality_score(chunk.content))
            for chunk in paragraph_chunks
        ]

        scored_chunks.sort(key=lambda x: x[1], reverse=True)

        selected = [chunk for chunk, _ in scored_chunks[:cap]]

        logger.debug(
            "Selected %d/%d paragraphs for enrichment (cap: %d)",
            len(selected),
            len(paragraph_chunks),
            cap,
        )

        return selected

    @staticmethod
    def _is_quality_paragraph(content: str) -> bool:
        if not content or not content.strip():
            return False
            
        content_lower = content.lower()

        if any(phrase in content_lower for phrase in JUNK_SECTION_TITLES):
            return False

        char_count = len(content)
        if char_count < 50:
            return False

        digit_ratio = sum(c.isdigit() for c in content) / char_count
        if digit_ratio > 0.5:
            return False

        return True

    @staticmethod
    def _calculate_quality_score(content: str) -> float:
        if not content or not content.strip():
            return 0.0
            
        score = 0.0
        char_count = len(content)

        if 250 <= char_count <= 1500:
            score += 2.0
        elif 150 <= char_count < 250 or 1500 < char_count <= 2500:
            score += 1.0

        sentences = len(re.findall(r'[.!?。！？]+', content))
        if sentences > 0:
            avg_chars_per_sentence = char_count / sentences
            if 50 <= avg_chars_per_sentence <= 150:
                score += 1.0

        if any(keyword in content.lower() for keyword in ARGUMENTATIVE_CONJUNCTIONS):
            score += 0.5

        if content.strip()[-1] in ".!?。！？":
            score += 0.5

        return score