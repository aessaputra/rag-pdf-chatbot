"""
RAG Service Tests

Verifies prompt context assembly, citation metadata extraction, and SSE streaming event generation.
"""

import json
from unittest.mock import AsyncMock, MagicMock
import pytest
from app.schemas import Citation
from app.services.rag_service import RAGService


def test_format_context_prompt_should_include_page_numbers_and_content():
    """Verify that RAGService formats retrieved vector chunks into structured context."""
    rag_service = RAGService(user_id="12345678-1234-1234-1234-123456789012", provider="gemini")
    mock_chunks = [
        {"content": "First chunk content about RAG.", "metadata": {"filename": "doc1.pdf", "page_number": 2}},
        {"content": "Second chunk content about Supabase.", "metadata": {"filename": "doc2.pdf", "page_number": 5}}
    ]
    prompt = rag_service.format_context_prompt(query="What is RAG?", chunks=mock_chunks)

    assert "First chunk content about RAG." in prompt
    assert "Page 2" in prompt
    assert "Page 5" in prompt
    assert "What is RAG?" in prompt


def test_extract_citations_should_return_valid_citation_dtos():
    """Verify that extract_citations builds valid Citation DTO objects."""
    rag_service = RAGService(user_id="12345678-1234-1234-1234-123456789012", provider="gemini")
    mock_chunks = [
        {"content": "Sample content snippet for testing citation extractions.", "metadata": {"filename": "paper.pdf", "page_number": 12}}
    ]

    citations = rag_service.extract_citations(mock_chunks)

    assert len(citations) == 1
    assert isinstance(citations[0], Citation)
    assert citations[0].filename == "paper.pdf"
    assert citations[0].page_number == 12
    assert "Sample content" in citations[0].content


@pytest.mark.asyncio
async def test_generate_rag_stream_emits_valid_sse_events():
    """Verify that generate_rag_stream yields SSE-formatted events for citations and tokens."""
    rag_service = RAGService(user_id="12345678-1234-1234-1234-123456789012", provider="gemini")

    
    # Mock LLM instance using MagicMock to support astream generator mocking
    mock_llm = MagicMock()

    async def mock_astream(prompt):
        yield MagicMock(content="Hello ")
        yield MagicMock(content="world!")

    mock_llm.astream = mock_astream
    rag_service.llm = mock_llm

    mock_chunks = [
        {"content": "Mock text for SSE stream test.", "metadata": {"filename": "test.pdf", "page_number": 1}}
    ]

    events = []
    async for event_line in rag_service.generate_rag_stream(
        query="Test query",
        user_id="12345678-1234-1234-1234-123456789012",
        mock_retrieved_chunks=mock_chunks
    ):
        events.append(event_line)

    assert len(events) >= 3
    # Verify first SSE frame is citations event
    assert events[0].startswith("event: citations\n")
    assert "test.pdf" in events[0]

    # Verify token SSE frames
    assert any("Hello" in e for e in events)
    assert any("world!" in e for e in events)

    # Verify last SSE frame is done event
    assert "event: done\n" in events[-1]
