from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.enrichment_job_service import EnrichmentJobService

MOCK_USER_ID = "11111111-2222-3333-4444-555555555555"
MOCK_DOC_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


def _make_supabase_mock() -> tuple[MagicMock, dict[str, MagicMock]]:
    tables = {
        name: MagicMock()
        for name in (
            "documents",
            "document_chunks",
            "user_embedding_configs",
            "user_provider_configs",
            "document_enrichment_jobs",
            "user_enrichment_configs",
        )
    }
    supabase = MagicMock()
    supabase.table.side_effect = lambda name: tables[name]
    return supabase, tables


def _configure_default_provider_config(tables: dict[str, MagicMock]) -> None:
    tables["user_provider_configs"].select.return_value.eq.return_value.order.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[{"provider": "gemini", "model_name": "gemini-2.5-flash"}]
    )


def _configure_embedding_config(tables: dict[str, MagicMock]) -> None:
    tables["user_embedding_configs"].select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"provider": "gemini", "model_name": "models/gemini-embedding-001", "embedding_dimensions": 768}]
    )


def _configure_enrichment_config(tables: dict[str, MagicMock], preset: str = "standard") -> None:
    tables["user_enrichment_configs"].select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"preset": preset}]
    )


@pytest.mark.asyncio
@patch("app.services.enrichment_job_service.get_supabase_client")
async def test_create_job_should_insert_pending_record(mock_get_supabase):
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase

    tables["document_enrichment_jobs"].insert.return_value.execute.return_value = MagicMock(
        data=[{
            "id": "job-123",
            "document_id": MOCK_DOC_ID,
            "user_id": MOCK_USER_ID,
            "status": "pending",
            "total_paragraphs": 10,
            "processed_paragraphs": 0,
            "question_chunks_created": 0,
            "failed_paragraphs": 0,
            "attempt_count": 0,
            "max_attempts": 3,
        }]
    )

    service = EnrichmentJobService()
    job = await service.create_job(document_id=MOCK_DOC_ID, user_id=MOCK_USER_ID, total_paragraphs=10)

    assert job["status"] == "pending"
    assert job["total_paragraphs"] == 10
    assert job["attempt_count"] == 0

    insert_call = tables["document_enrichment_jobs"].insert.call_args
    inserted_data = insert_call[0][0]
    assert inserted_data["document_id"] == MOCK_DOC_ID
    assert inserted_data["user_id"] == MOCK_USER_ID
    assert inserted_data["status"] == "pending"
    assert inserted_data["total_paragraphs"] == 10


@pytest.mark.asyncio
@patch("app.services.enrichment_job_service.get_supabase_client")
async def test_get_job_should_return_job_record(mock_get_supabase):
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase

    tables["document_enrichment_jobs"].select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{
            "id": "job-123",
            "document_id": MOCK_DOC_ID,
            "user_id": MOCK_USER_ID,
            "status": "running",
        }]
    )

    service = EnrichmentJobService()
    job = await service.get_job(document_id=MOCK_DOC_ID)

    assert job is not None
    assert job["document_id"] == MOCK_DOC_ID
    assert job["status"] == "running"


@pytest.mark.asyncio
@patch("app.services.enrichment_job_service.get_supabase_client")
async def test_get_job_should_return_none_when_not_found(mock_get_supabase):
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase

    tables["document_enrichment_jobs"].select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[]
    )

    service = EnrichmentJobService()
    job = await service.get_job(document_id=MOCK_DOC_ID)

    assert job is None


@pytest.mark.asyncio
@patch("app.services.enrichment_job_service.get_supabase_client")
async def test_update_progress_should_increment_counts(mock_get_supabase):
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase

    tables["document_enrichment_jobs"].update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{
            "id": "job-123",
            "processed_paragraphs": 5,
            "question_chunks_created": 25,
        }]
    )

    service = EnrichmentJobService()
    await service.update_progress(
        document_id=MOCK_DOC_ID,
        user_id=MOCK_USER_ID,
        processed_paragraphs=5,
        question_chunks_created=25,
    )

    update_call = tables["document_enrichment_jobs"].update.call_args
    update_data = update_call[0][0]
    assert update_data["processed_paragraphs"] == 5
    assert update_data["question_chunks_created"] == 25


@pytest.mark.asyncio
@patch("app.services.enrichment_job_service.get_supabase_client")
async def test_start_job_should_set_status_running_and_started_at(mock_get_supabase):
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase

    tables["document_enrichment_jobs"].update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"status": "running"}]
    )

    service = EnrichmentJobService()
    await service.start_job(document_id=MOCK_DOC_ID, user_id=MOCK_USER_ID)

    update_call = tables["document_enrichment_jobs"].update.call_args
    update_data = update_call[0][0]
    assert update_data["status"] == "running"
    assert "started_at" in update_data


@pytest.mark.asyncio
@patch("app.services.enrichment_job_service.get_supabase_client")
async def test_complete_job_should_set_status_completed_and_completed_at(mock_get_supabase):
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase

    tables["document_enrichment_jobs"].update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"status": "completed"}]
    )

    service = EnrichmentJobService()
    await service.complete_job(
        document_id=MOCK_DOC_ID,
        user_id=MOCK_USER_ID,
        processed_paragraphs=10,
        question_chunks_created=50,
    )

    update_call = tables["document_enrichment_jobs"].update.call_args
    update_data = update_call[0][0]
    assert update_data["status"] == "completed"
    assert "completed_at" in update_data
    assert update_data["processed_paragraphs"] == 10
    assert update_data["question_chunks_created"] == 50


@pytest.mark.asyncio
@patch("app.services.enrichment_job_service.get_supabase_client")
async def test_fail_job_should_set_status_failed_and_increment_attempt_count(mock_get_supabase):
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase

    tables["document_enrichment_jobs"].update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"status": "failed", "attempt_count": 1}]
    )

    service = EnrichmentJobService()
    await service.fail_job(
        document_id=MOCK_DOC_ID,
        user_id=MOCK_USER_ID,
        error_message="Rate limit exceeded",
        failed_paragraphs=3,
    )

    update_call = tables["document_enrichment_jobs"].update.call_args
    update_data = update_call[0][0]
    assert update_data["status"] == "failed"
    assert update_data["last_error"] == "Rate limit exceeded"
    assert update_data["failed_paragraphs"] == 3


@pytest.mark.asyncio
@patch("app.services.enrichment_job_service.get_supabase_client")
async def test_get_retryable_jobs_should_return_failed_jobs_below_max_attempts(mock_get_supabase):
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase

    tables["document_enrichment_jobs"].select.return_value.eq.return_value.lt.return_value.execute.return_value = MagicMock(
        data=[
            {"id": "job-1", "document_id": "doc-1", "status": "failed", "attempt_count": 1},
            {"id": "job-2", "document_id": "doc-2", "status": "failed", "attempt_count": 2},
        ]
    )

    service = EnrichmentJobService()
    jobs = await service.get_retryable_jobs()

    assert len(jobs) == 2
    assert all(j["status"] == "failed" for j in jobs)


@pytest.mark.asyncio
@patch("app.services.enrichment_job_service.get_supabase_client")
async def test_get_enrichment_cap_should_return_preset_values(mock_get_supabase):
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase

    service = EnrichmentJobService()

    assert service.get_preset_cap("off") == 0
    assert service.get_preset_cap("standard") == 75
    assert service.get_preset_cap("high") == 150
    assert service.get_preset_cap("full") == 999999


@pytest.mark.asyncio
@patch("app.services.enrichment_job_service.get_supabase_client")
async def test_get_user_preset_should_return_user_configured_preset(mock_get_supabase):
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase

    tables["user_enrichment_configs"].select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"preset": "high"}]
    )

    service = EnrichmentJobService()
    preset = await service.get_user_preset(user_id=MOCK_USER_ID)

    assert preset == "high"


@pytest.mark.asyncio
@patch("app.services.enrichment_job_service.get_supabase_client")
async def test_get_user_preset_should_default_to_standard_when_not_configured(mock_get_supabase):
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase

    tables["user_enrichment_configs"].select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[]
    )

    service = EnrichmentJobService()
    preset = await service.get_user_preset(user_id=MOCK_USER_ID)

    assert preset == "standard"


def test_select_paragraphs_by_quality_should_prioritize_longer_content():
    from app.schemas import DocumentChunkDTO

    chunks = [
        DocumentChunkDTO(
            id="short-1",
            content="Short.",
            page_number=1,
            filename="test.pdf",
            metadata={"type": "paragraph"},
        ),
        DocumentChunkDTO(
            id="long-1",
            content="This is a much longer paragraph with more substantive content that should be prioritized.",
            page_number=1,
            filename="test.pdf",
            metadata={"type": "paragraph"},
        ),
        DocumentChunkDTO(
            id="medium-1",
            content="Medium length content here.",
            page_number=1,
            filename="test.pdf",
            metadata={"type": "paragraph"},
        ),
    ]

    service = EnrichmentJobService()
    selected = service.select_paragraphs_by_quality(chunks, cap=2)

    assert len(selected) == 2
    assert selected[0].id == "long-1"
    assert selected[1].id == "medium-1"


def test_select_paragraphs_by_quality_should_skip_very_short_paragraphs():
    from app.schemas import DocumentChunkDTO

    chunks = [
        DocumentChunkDTO(
            id="tiny-1",
            content="x",
            page_number=1,
            filename="test.pdf",
            metadata={"type": "paragraph"},
        ),
        DocumentChunkDTO(
            id="good-1",
            content="This paragraph has enough content to be considered valuable for enrichment.",
            page_number=1,
            filename="test.pdf",
            metadata={"type": "paragraph"},
        ),
    ]

    service = EnrichmentJobService()
    selected = service.select_paragraphs_by_quality(chunks, cap=10, min_length=20)

    assert len(selected) == 1
    assert selected[0].id == "good-1"


def test_select_paragraphs_by_quality_should_filter_by_type():
    from app.schemas import DocumentChunkDTO

    chunks = [
        DocumentChunkDTO(
            id="para-1",
            content="A paragraph chunk with sufficient length to pass the minimum threshold.",
            page_number=1,
            filename="test.pdf",
            metadata={"type": "paragraph"},
        ),
        DocumentChunkDTO(
            id="question-1",
            content="A question chunk that should be ignored despite having enough length.",
            page_number=1,
            filename="test.pdf",
            metadata={"type": "question"},
        ),
    ]

    service = EnrichmentJobService()
    selected = service.select_paragraphs_by_quality(chunks, cap=10)

    assert len(selected) == 1
    assert selected[0].id == "para-1"
