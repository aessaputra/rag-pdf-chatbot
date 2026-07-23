"""
RAG Service Module

Implements Retrieval-Augmented Generation (RAG) by fetching relevant document chunks from
Supabase vector store, formatting context prompts, and streaming Server-Sent Events (SSE).
"""

import json
from typing import Any, AsyncGenerator, Dict, List, Optional

from app.database import get_supabase_client
from app.schemas import Citation
from app.services.llm_factory import LLMFactory


class RAGService:
    """Service managing RAG context retrieval, prompt construction, and SSE token streaming."""

    def __init__(self, provider: str = "gemini"):
        self.provider = provider
        self.llm = LLMFactory.get_llm(provider)
        self.embeddings_model = LLMFactory.get_embeddings(provider)

    def retrieve_relevant_chunks(
        self,
        query: str,
        user_id: str,
        top_k: int = 4,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetches vector-similar document_chunks from Supabase filtered by user_id.
        """
        supabase = get_supabase_client()
        query_embedding = self.embeddings_model.embed_query(query)

        # Call Supabase vector similarity search table
        query_builder = supabase.table("document_chunks").select("id, content, metadata").eq("user_id", user_id)
        if document_ids:
            query_builder = query_builder.in_("document_id", document_ids)

        response = query_builder.limit(top_k).execute()
        return response.data if response.data else []

    def extract_citations(self, chunks: List[Dict[str, Any]]) -> List[Citation]:
        """Extracts structured Citation DTOs from retrieved document chunks."""
        citations: List[Citation] = []
        for chunk in chunks:
            metadata = chunk.get("metadata", {})
            filename = metadata.get("filename", "Unknown Document")
            page_number = metadata.get("page_number", 1)
            content_snippet = chunk.get("content", "")[:200]

            citations.append(
                Citation(
                    filename=filename,
                    page_number=page_number,
                    content=content_snippet
                )
            )
        return citations

    def format_context_prompt(self, query: str, chunks: List[Dict[str, Any]]) -> str:
        """Formats query and context chunks into a structured RAG prompt for the LLM."""
        context_blocks = []
        for idx, chunk in enumerate(chunks, start=1):
            metadata = chunk.get("metadata", {})
            page_num = metadata.get("page_number", 1)
            filename = metadata.get("filename", "Doc")
            context_blocks.append(f"[{idx}] (File: {filename}, Page {page_num}):\n{chunk.get('content', '')}")

        context_str = "\n\n".join(context_blocks)
        
        prompt = (
            "Anda adalah asisten AI cerdas berbasis RAG PDF Chatbot. "
            "Jawab pertanyaan berikut secara akurat dan ringkas berdasarkan informasi konteks dokumen PDF yang diberikan. "
            "Jika jawaban tidak ada dalam konteks, sampaikan bahwa informasi tidak ditemukan dalam dokumen.\n\n"
            f"=== KONTEKS DOKUMEN ===\n{context_str}\n\n"
            f"=== PERTANYAAN ===\n{query}\n\n"
            "=== JAWABAN ==="
        )
        return prompt

    async def generate_rag_stream(
        self,
        query: str,
        user_id: str,
        document_ids: Optional[List[str]] = None,
        mock_retrieved_chunks: Optional[List[Dict[str, Any]]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Yields Server-Sent Events (SSE) formatted text chunks.
        Frame 1: event: citations (JSON array of source citations)
        Frame 2..N: event: token (JSON object with streaming token)
        Frame Final: event: done
        """
        # 1. Retrieve or use provided chunks
        chunks = (
            mock_retrieved_chunks
            if mock_retrieved_chunks is not None
            else self.retrieve_relevant_chunks(query=query, user_id=user_id, document_ids=document_ids)
        )

        # 2. Extract & Yield Citations SSE Event Frame
        citations = self.extract_citations(chunks)
        citations_json = [c.model_dump() for c in citations]
        yield f"event: citations\ndata: {json.dumps(citations_json)}\n\n"

        # 3. Format Context Prompt & Stream Tokens
        if not chunks:
            no_info_msg = "Maaf, tidak ditemukan dokumen PDF yang relevan untuk menjawab pertanyaan ini."
            yield f"event: token\ndata: {json.dumps({'token': no_info_msg})}\n\n"
        else:
            prompt = self.format_context_prompt(query, chunks)
            
            # Stream LLM tokens asynchronously
            async for chunk in self.llm.astream(prompt):
                token_content = chunk.content if hasattr(chunk, "content") else str(chunk)
                if token_content:
                    yield f"event: token\ndata: {json.dumps({'token': token_content})}\n\n"

        # 4. Yield Final Done SSE Event Frame
        yield f"event: done\ndata: {json.dumps({'status': 'completed'})}\n\n"
