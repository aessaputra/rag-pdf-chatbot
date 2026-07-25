"""
RAG Service Tests

Verifies prompt context assembly, citation metadata extraction, and SSE streaming event generation.
Tests adapted for the decomposed module structure: ContextRetriever, PromptBuilder, RAGService.
"""

from unittest.mock import MagicMock
import pytest
from app.schemas import Citation
from app.services.context_retriever import ContextRetriever
from app.services.prompt_builder import PromptBuilder
from app.services.rag_service import RAGService


def test_format_context_prompt_should_include_page_numbers_and_content():
    """Verify that PromptBuilder formats retrieved vector chunks into structured context."""
    mock_chunks = [
        {"content": "First chunk content about RAG.", "metadata": {"filename": "doc1.pdf", "page_number": 2}},
        {"content": "Second chunk content about Supabase.", "metadata": {"filename": "doc2.pdf", "page_number": 5}}
    ]
    prompt = PromptBuilder.format_context_prompt(query="What is RAG?", chunks=mock_chunks)

    assert "First chunk content about RAG." in prompt
    assert "Page 2" in prompt
    assert "Page 5" in prompt
    assert "What is RAG?" in prompt


def test_extract_citations_should_return_valid_citation_dtos():
    """Verify that ContextRetriever.extract_citations builds valid Citation DTO objects."""
    mock_chunks = [
        {"content": "Sample content snippet for testing citation extractions.", "metadata": {"filename": "paper.pdf", "page_number": 12}}
    ]

    citations = ContextRetriever.extract_citations(mock_chunks)

    assert len(citations) == 1
    assert isinstance(citations[0], Citation)
    assert citations[0].filename == "paper.pdf"
    assert citations[0].page_number == 12
    assert "Sample content" in citations[0].content


@pytest.mark.asyncio
async def test_generate_rag_stream_emits_valid_sse_events():
    """Verify that RAGService.generate_rag_stream yields ServerSentEvent objects for citations and tokens."""
    # Mock LLM
    mock_llm = MagicMock()

    async def mock_astream(prompt):
        yield MagicMock(content="Hello ")
        yield MagicMock(content="world!")

    mock_llm.astream = mock_astream

    # Mock retriever
    mock_retriever = MagicMock()
    mock_retriever.retrieve_relevant_chunks.return_value = [
        {"content": "Mock text for SSE stream test.", "metadata": {"filename": "test.pdf", "page_number": 1}}
    ]

    service = RAGService(
        user_id="12345678-1234-1234-1234-123456789012",
        llm=mock_llm,
        retriever=mock_retriever,
    )

    events = []
    async for event in service.generate_rag_stream(query="Test query"):
        events.append(event)

    assert len(events) >= 3

    # Verify first SSE event is citations
    assert events[0].event == "citations"

    # Verify token events contain expected content
    token_events = [e for e in events if e.event == "token"]
    token_data = [e.data for e in token_events]
    assert any("Hello" in str(d) for d in token_data)
    assert any("world!" in str(d) for d in token_data)

    # Verify last event is done
    assert events[-1].event == "done"
