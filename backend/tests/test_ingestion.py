"""
PDF Ingestion Service Tests

Verifies paragraph-based chunking with exact line number metadata,
boilerplate removal, and background document processing outcomes.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas import DocumentChunkDTO
from app.services.ingestion_service import PDFIngestionService, is_retryable_error


def test_paragraph_chunking_should_split_on_double_newlines_with_exact_line_numbers():
    """Verify paragraphs are split on blank lines with exact 1-indexed line spans per page."""
    ingestion_service = PDFIngestionService()
    sample_text = (
        "First paragraph line one.\n"
        "First paragraph line two.\n"
        "\n"
        "Second paragraph.\n"
        "\n"
        "\n"
        "Third paragraph after extra blank."
    )

    chunks = ingestion_service.split_text_with_metadata(
        text=sample_text,
        filename="test_doc.pdf",
        page_number=3,
    )

    assert len(chunks) == 3

    first, second, third = chunks
    assert first.content == "First paragraph line one.\nFirst paragraph line two."
    assert first.metadata["line_start"] == 1
    assert first.metadata["line_end"] == 2

    assert second.content == "Second paragraph."
    assert second.metadata["line_start"] == 4
    assert second.metadata["line_end"] == 4

    assert third.content == "Third paragraph after extra blank."
    assert third.metadata["line_start"] == 7
    assert third.metadata["line_end"] == 7

    for chunk in chunks:
        assert isinstance(chunk, DocumentChunkDTO)
        assert chunk.filename == "test_doc.pdf"
        assert chunk.page_number == 3
        assert chunk.metadata["filename"] == "test_doc.pdf"
        assert chunk.metadata["page_number"] == 3
        assert chunk.metadata["type"] == "paragraph"


def test_paragraph_chunking_should_skip_empty_whitespace_text():
    """Verify that empty or whitespace-only text produces no chunks."""
    ingestion_service = PDFIngestionService()
    empty_chunks = ingestion_service.split_text_with_metadata(
        text="   \n\n  ",
        filename="empty.pdf",
        page_number=1
    )
    assert len(empty_chunks) == 0


def test_pdf_ingestion_removes_boilerplate_headers():
    """Verify boilerplate lines are stripped while line numbers stay anchored to the raw page text."""
    ingestion_service = PDFIngestionService()

    # 3 pages (>2 triggers boilerplate detection), each: header, page label, content, footer
    pdf_bytes = _build_pdf_with_text([
        ["BITS Header", "Page 1", "Real content for page one.", "Copyright 2023"],
        ["BITS Header", "Page 2", "Real content for page two.", "Copyright 2023"],
        ["BITS Header", "Page 3", "Real content for page three.", "Copyright 2023"],
    ])

    chunks = ingestion_service.parse_pdf_bytes(pdf_bytes, "bits.pdf")

    assert len(chunks) == 3
    for index, chunk in enumerate(chunks):
        page_number = index + 1
        assert chunk.content.strip() == f"Real content for page {'one' if page_number == 1 else 'two' if page_number == 2 else 'three'}."
        assert chunk.page_number == page_number
        # removal must not shift the citation line span.
        assert chunk.metadata["line_start"] == 5
        assert chunk.metadata["line_end"] == 5


# ── HyDE Question Generation ────────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_questions_should_parse_numbered_list_into_five_questions():
    """Verify a clean numbered LLM response yields exactly 5 questions."""
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=MagicMock(
        content=(
            "1. Apa itu RAG?\n"
            "2. Bagaimana RAG meningkatkan akurasi?\n"
            "3. Apa peran vektor dalam RAG?\n"
            "4. Kapan RAG digunakan?\n"
            "5. Mengapa RAG membutuhkan embedding?"
        ))
    )

    ingestion_service = PDFIngestionService()
    questions = await ingestion_service.generate_questions("Paragraf tentang RAG.", mock_llm)

    assert questions == [
        "Apa itu RAG?",
        "Bagaimana RAG meningkatkan akurasi?",
        "Apa peran vektor dalam RAG?",
        "Kapan RAG digunakan?",
        "Mengapa RAG membutuhkan embedding?",
    ]


@pytest.mark.asyncio
async def test_generate_questions_should_tolerate_messy_llm_output():
    """Verify preamble lines, bullets, quotes, and extra questions are cleaned up."""
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=MagicMock(
        content=(
            "Berikut lima pertanyaan:\n"
            "- \"Apa itu RAG?\"\n"
            "2) Bagaimana RAG bekerja?\n"
            "3. Apa itu embedding?\n"
            "* Apa itu vektor?\n"
            "5. Mengapa perlu chunking?\n"
            "6. Pertanyaan keenam yang harus dibuang?"
        )
    ))

    ingestion_service = PDFIngestionService()
    questions = await ingestion_service.generate_questions("Paragraf tentang RAG.", mock_llm)

    assert questions == [
        "Apa itu RAG?",
        "Bagaimana RAG bekerja?",
        "Apa itu embedding?",
        "Apa itu vektor?",
        "Mengapa perlu chunking?",
    ]


@pytest.mark.asyncio
async def test_generate_questions_should_raise_on_unparseable_llm_output():
    """Verify an empty or question-less LLM response is treated as generation failure."""
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content=""))

    ingestion_service = PDFIngestionService()
    with pytest.raises(ValueError):
        await ingestion_service.generate_questions("Paragraf tentang RAG.", mock_llm)


# ── Background Document Processing ──────────────────────────────────

MOCK_USER_ID = "11111111-2222-3333-4444-555555555555"
MOCK_DOC_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


def _build_pdf_with_text(pages: list[list[str]]) -> bytes:
    """Builds a minimal valid PDF where each inner list is one page of text lines."""
    font_obj_id = 3 + 2 * len(pages)
    kid_refs = " ".join(f"{3 + 2 * i} 0 R" for i in range(len(pages)))

    objects: dict[int, bytes] = {
        1: b"<< /Type /Catalog /Pages 2 0 R >>",
        2: f"<< /Type /Pages /Kids [{kid_refs}] /Count {len(pages)} >>".encode(),
        font_obj_id: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    }

    for i, lines in enumerate(pages):
        text_ops = ["BT /F1 12 Tf 72 720 Td"]
        for j, line in enumerate(lines):
            if j > 0:
                text_ops.append("0 -28 Td")
            text_ops.append(f"({line}) Tj")
        text_ops.append("ET")
        stream = "\n".join(text_ops).encode("latin-1")

        objects[3 + 2 * i] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 {font_obj_id} 0 R >> >> /Contents {4 + 2 * i} 0 R >>"
        ).encode()
        objects[4 + 2 * i] = (
            b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream"
        )

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = {}
    for obj_id in sorted(objects):
        offsets[obj_id] = len(pdf)
        pdf += f"{obj_id} 0 obj\n".encode() + objects[obj_id] + b"\nendobj\n"
    xref_pos = len(pdf)
    max_id = max(objects)
    pdf += f"xref\n0 {max_id + 1}\n".encode()
    pdf += b"0000000000 65535 f \n"
    for obj_id in range(1, max_id + 1):
        pdf += f"{offsets[obj_id]:010d} 00000 n \n".encode()
    pdf += (
        f"trailer\n<< /Size {max_id + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF"
    ).encode()
    return bytes(pdf)


def _make_supabase_mock() -> tuple[MagicMock, dict[str, MagicMock]]:
    tables = {name: MagicMock() for name in ("documents", "document_chunks", "user_embedding_configs", "user_provider_configs")}
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


@pytest.mark.asyncio
@patch("app.services.llm_factory.LLMFactory.get_embeddings_for_config")
@patch("app.services.rag_service.get_supabase_client")
@patch("app.services.ingestion_service.get_supabase_client")
async def test_process_document_should_embed_chunks_and_mark_document_ready(mock_get_supabase, mock_rag_supabase, mock_get_embeddings):
    """Verify background processing stores paragraph chunks without chat-model fan-out."""
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase
    mock_rag_supabase.return_value = mock_supabase
    _configure_embedding_config(tables)

    mock_embeddings = MagicMock()
    mock_embeddings.embed_documents.return_value = [[0.1, 0.2, 0.3]]
    mock_get_embeddings.return_value = mock_embeddings

    pdf_bytes = _build_pdf_with_text([["Alpha paragraph text."]])

    ingestion_service = PDFIngestionService()
    await ingestion_service.process_document(
        document_id=MOCK_DOC_ID,
        user_id=MOCK_USER_ID,
        filename="paper.pdf",
        pdf_bytes=pdf_bytes,
    )

    paragraph_content = "Alpha paragraph text."
    inserted_records = tables["document_chunks"].insert.call_args[0][0]
    assert len(inserted_records) == 1

    paragraph_record = inserted_records[0]
    assert paragraph_record["document_id"] == MOCK_DOC_ID
    assert paragraph_record["user_id"] == MOCK_USER_ID
    assert paragraph_record["content"] == paragraph_content
    assert paragraph_record["page_number"] == 1
    assert paragraph_record["metadata"]["line_start"] == 1
    assert paragraph_record["metadata"]["line_end"] == 1
    assert paragraph_record["metadata"]["type"] == "paragraph"
    assert "paragraph_content" not in paragraph_record["metadata"]

    mock_embeddings.embed_documents.assert_called_once()
    embedded_texts = mock_embeddings.embed_documents.call_args[0][0]
    assert embedded_texts == [paragraph_content]

    tables["user_embedding_configs"].update.assert_not_called()
    tables["documents"].update.assert_called_once_with({"status": "ready", "total_pages": 1})

def test_is_retryable_error():
    assert is_retryable_error(Exception("429 Too Many Requests")) is True
    assert is_retryable_error(Exception("503 Service Unavailable")) is True
    assert is_retryable_error(Exception("Timeout occurred")) is True
    assert is_retryable_error(Exception("401 Unauthorized")) is False
    assert is_retryable_error(Exception("400 Bad Request")) is False


@pytest.mark.asyncio
@patch("app.services.llm_factory.LLMFactory.get_embeddings_for_config")
@patch("app.services.rag_service.get_supabase_client")
@patch("app.services.ingestion_service.get_supabase_client")
async def test_process_document_should_mark_failed_when_embedding_fails(mock_get_supabase, mock_rag_supabase, mock_get_embeddings):
    """Verify embedding failures mark the document failed."""
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase
    mock_rag_supabase.return_value = mock_supabase
    _configure_embedding_config(tables)

    mock_embeddings = MagicMock()
    mock_embeddings.embed_documents.side_effect = Exception("429 Too Many Requests")
    mock_get_embeddings.return_value = mock_embeddings

    pdf_bytes = _build_pdf_with_text([["Alpha paragraph text."]])

    ingestion_service = PDFIngestionService()
    await ingestion_service.process_document(
        document_id=MOCK_DOC_ID,
        user_id=MOCK_USER_ID,
        filename="paper.pdf",
        pdf_bytes=pdf_bytes,
    )

    tables["documents"].update.assert_called_once_with({"status": "failed"})
    tables["document_chunks"].insert.assert_not_called()


@pytest.mark.asyncio
@patch("app.services.ingestion_service.EnrichmentJobService")
async def test_enrich_document_questions_should_store_linked_question_chunks(mock_job_service_class):
    mock_supabase, tables = _make_supabase_mock()

    mock_job_service = MagicMock()
    mock_job_service_class.return_value = mock_job_service
    mock_job_service.start_job = AsyncMock()
    mock_job_service.update_progress = AsyncMock()
    mock_job_service.complete_job = AsyncMock()
    mock_job_service.select_paragraphs_by_quality = lambda chunks, cap: [
        DocumentChunkDTO(
            id="paragraph-1",
            content="Alpha paragraph text with enough length to pass minimum threshold.",
            page_number=2,
            filename="paper.pdf",
            metadata={
                "filename": "paper.pdf",
                "page_number": 2,
                "line_start": 4,
                "line_end": 6,
                "type": "paragraph",
            },
        )
    ]

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="1. What is alpha?\n2. Why alpha matters?"))
    mock_embeddings = MagicMock()
    mock_embeddings.embed_documents.return_value = [[0.1, 0.2], [0.3, 0.4]]

    ingestion_service = PDFIngestionService()
    await ingestion_service.enrich_document_questions(
        supabase=mock_supabase,
        document_id=MOCK_DOC_ID,
        user_id=MOCK_USER_ID,
        chunks=[],
        llm=mock_llm,
        embeddings_model=mock_embeddings,
    )

    inserted_records = tables["document_chunks"].insert.call_args[0][0]
    assert len(inserted_records) == 2
    assert [record["metadata"]["question"] for record in inserted_records] == ["What is alpha?", "Why alpha matters?"]
    for record in inserted_records:
        assert record["parent_chunk_id"] == "paragraph-1"
        assert "Alpha paragraph text" in record["content"]
        assert record["metadata"]["type"] == "question"
        assert record["metadata"]["line_start"] == 4
        assert record["metadata"]["line_end"] == 6
    assert mock_embeddings.embed_documents.call_args[0][0] == ["What is alpha?", "Why alpha matters?"]


@pytest.mark.asyncio
@patch("app.services.ingestion_service.EnrichmentJobService")
async def test_enrich_document_questions_should_skip_failed_paragraphs_and_continue(mock_job_service_class):
    mock_supabase, tables = _make_supabase_mock()

    chunks = [
        DocumentChunkDTO(
            id="paragraph-1",
            content="Broken paragraph with enough length to pass threshold.",
            page_number=1,
            filename="paper.pdf",
            metadata={"filename": "paper.pdf", "page_number": 1, "line_start": 1, "line_end": 1, "type": "paragraph"},
        ),
        DocumentChunkDTO(
            id="paragraph-2",
            content="Working paragraph with enough length to pass threshold.",
            page_number=1,
            filename="paper.pdf",
            metadata={"filename": "paper.pdf", "page_number": 1, "line_start": 2, "line_end": 2, "type": "paragraph"},
        ),
    ]

    mock_job_service = MagicMock()
    mock_job_service_class.return_value = mock_job_service
    mock_job_service.start_job = AsyncMock()
    mock_job_service.update_progress = AsyncMock()
    mock_job_service.complete_job = AsyncMock()
    mock_job_service.select_paragraphs_by_quality = lambda c, cap: chunks

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(side_effect=[Exception("401 Unauthorized"), MagicMock(content="1. What works?")])
    mock_embeddings = MagicMock()
    mock_embeddings.embed_documents.return_value = [[0.1, 0.2]]

    ingestion_service = PDFIngestionService()
    await ingestion_service.enrich_document_questions(
        supabase=mock_supabase,
        document_id=MOCK_DOC_ID,
        user_id=MOCK_USER_ID,
        chunks=chunks,
        llm=mock_llm,
        embeddings_model=mock_embeddings,
    )

    inserted_records = tables["document_chunks"].insert.call_args[0][0]
    assert len(inserted_records) == 1
    assert inserted_records[0]["parent_chunk_id"] == "paragraph-2"
    assert inserted_records[0]["metadata"]["question"] == "What works?"
    assert tables["documents"].update.call_count == 0


@pytest.mark.asyncio
@patch("app.services.ingestion_service.EnrichmentJobService")
async def test_enrich_document_questions_should_cap_enriched_paragraphs_at_75(mock_job_service_class):
    mock_supabase, tables = _make_supabase_mock()

    chunks = [
        DocumentChunkDTO(
            id=f"paragraph-{index}",
            content=f"Paragraph {index} with enough length to pass minimum threshold for selection.",
            page_number=1,
            filename="paper.pdf",
            metadata={"filename": "paper.pdf", "page_number": 1, "line_start": index, "line_end": index, "type": "paragraph"},
        )
        for index in range(80)
    ]

    mock_job_service = MagicMock()
    mock_job_service_class.return_value = mock_job_service
    mock_job_service.start_job = AsyncMock()
    mock_job_service.update_progress = AsyncMock()
    mock_job_service.complete_job = AsyncMock()
    mock_job_service.select_paragraphs_by_quality = lambda c, cap: chunks[:75]

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="1. What is this?"))
    mock_embeddings = MagicMock()
    mock_embeddings.embed_documents.return_value = [[0.1, 0.2]] * 75

    ingestion_service = PDFIngestionService()
    await ingestion_service.enrich_document_questions(
        supabase=mock_supabase,
        document_id=MOCK_DOC_ID,
        user_id=MOCK_USER_ID,
        chunks=chunks,
        llm=mock_llm,
        embeddings_model=mock_embeddings,
        batch_size=1000,
    )

    inserted_records = tables["document_chunks"].insert.call_args[0][0]
    assert len(inserted_records) == 75
    assert mock_llm.ainvoke.call_count == 75
    assert inserted_records[-1]["parent_chunk_id"] == "paragraph-74"


@pytest.mark.asyncio
@patch("app.services.ingestion_service.get_supabase_client")
async def test_process_document_should_mark_document_failed_on_unparsable_pdf(mock_get_supabase):
    """Verify background processing marks the document failed instead of raising."""
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase

    ingestion_service = PDFIngestionService()
    await ingestion_service.process_document(
        document_id=MOCK_DOC_ID,
        user_id=MOCK_USER_ID,
        filename="broken.pdf",
        pdf_bytes=b"this is not a real pdf",
    )

    tables["documents"].update.assert_called_once_with({"status": "failed"})
    tables["document_chunks"].insert.assert_not_called()
