"""
PDF Ingestion Service Tests

Verifies paragraph-based chunking with exact line number metadata,
boilerplate removal, and background document processing outcomes.
"""

from unittest.mock import MagicMock, patch

import pytest
from app.schemas import DocumentChunkDTO
from app.services.ingestion_service import PDFIngestionService


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
        assert chunk.content == f"Real content for page {'one' if page_number == 1 else 'two' if page_number == 2 else 'three'}."
        assert chunk.page_number == page_number
        # Content sits on line 3 of the raw extracted page text; boilerplate
        # removal must not shift the citation line span.
        assert chunk.metadata["line_start"] == 3
        assert chunk.metadata["line_end"] == 3


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
    tables = {name: MagicMock() for name in ("documents", "document_chunks", "user_embedding_configs")}
    supabase = MagicMock()
    supabase.table.side_effect = lambda name: tables[name]
    return supabase, tables


@patch("app.services.ingestion_service.LLMFactory.get_embeddings_for_config")
@patch("app.services.ingestion_service.get_supabase_client")
def test_process_document_should_embed_chunks_and_mark_document_ready(mock_get_supabase, mock_get_embeddings):
    """Verify background processing embeds parsed paragraphs and marks the document ready."""
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase
    tables["user_embedding_configs"].select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"provider": "gemini", "model_name": "models/gemini-embedding-001", "embedding_dimensions": 768}]
    )

    mock_embeddings = MagicMock()
    mock_embeddings.embed_documents.return_value = [[0.1, 0.2, 0.3]]
    mock_get_embeddings.return_value = mock_embeddings

    pdf_bytes = _build_pdf_with_text([["Alpha paragraph text.", "Beta continues here."]])

    ingestion_service = PDFIngestionService()
    ingestion_service.process_document(
        document_id=MOCK_DOC_ID,
        user_id=MOCK_USER_ID,
        filename="paper.pdf",
        pdf_bytes=pdf_bytes,
    )

    inserted_records = tables["document_chunks"].insert.call_args[0][0]
    assert len(inserted_records) == 1
    assert inserted_records[0]["document_id"] == MOCK_DOC_ID
    assert inserted_records[0]["user_id"] == MOCK_USER_ID
    assert inserted_records[0]["content"] == "Alpha paragraph text.\nBeta continues here."
    assert inserted_records[0]["page_number"] == 1
    assert inserted_records[0]["metadata"]["line_start"] == 1
    assert inserted_records[0]["metadata"]["line_end"] == 2
    assert inserted_records[0]["metadata"]["type"] == "paragraph"
    assert inserted_records[0]["embedding"] == [0.1, 0.2, 0.3]

    tables["user_embedding_configs"].update.assert_called_once_with({"locked": True})
    tables["documents"].update.assert_called_once_with({"status": "ready", "total_pages": 1})


@patch("app.services.ingestion_service.get_supabase_client")
def test_process_document_should_mark_document_failed_on_unparsable_pdf(mock_get_supabase):
    """Verify background processing marks the document failed instead of raising."""
    mock_supabase, tables = _make_supabase_mock()
    mock_get_supabase.return_value = mock_supabase

    ingestion_service = PDFIngestionService()
    ingestion_service.process_document(
        document_id=MOCK_DOC_ID,
        user_id=MOCK_USER_ID,
        filename="broken.pdf",
        pdf_bytes=b"this is not a real pdf",
    )

    tables["documents"].update.assert_called_once_with({"status": "failed"})
    tables["document_chunks"].insert.assert_not_called()
