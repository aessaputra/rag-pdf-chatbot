"""
PDF Ingestion Service Tests

Verifies text chunking, page annotation, metadata preservation, and batch processing logic.
"""

import pytest
from app.schemas import DocumentChunkDTO
from app.services.ingestion_service import PDFIngestionService


def test_chunking_service_should_split_long_text_and_preserve_metadata():
    """Verify that text chunker splits long paragraphs into chunks with metadata."""
    ingestion_service = PDFIngestionService(chunk_size=100, chunk_overlap=20)
    sample_text = (
        "This is a comprehensive test paragraph designed to verify that the text splitter "
        "properly breaks long document content into smaller overlapping chunks while retaining "
        "accurate page numbers and document filenames in every generated metadata annotation."
    )
    
    chunks = ingestion_service.split_text_with_metadata(
        text=sample_text,
        filename="test_doc.pdf",
        page_number=1
    )

    assert len(chunks) >= 2
    for chunk in chunks:
        assert isinstance(chunk, DocumentChunkDTO)
        assert chunk.filename == "test_doc.pdf"
        assert chunk.page_number == 1
        assert chunk.metadata["page_number"] == 1
        assert chunk.metadata["filename"] == "test_doc.pdf"
        assert len(chunk.content) <= 100


def test_chunking_service_should_skip_empty_whitespace_text():
    """Verify that empty or whitespace-only text produces no chunks."""
    ingestion_service = PDFIngestionService()
    empty_chunks = ingestion_service.split_text_with_metadata(
        text="   \n\n  ",
        filename="empty.pdf",
        page_number=1
    )
    assert len(empty_chunks) == 0
