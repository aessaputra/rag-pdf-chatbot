"""
Context Retriever Module

Handles vector similarity search against Supabase pgvector and extracts
structured Citation DTOs from retrieved document chunks.
"""

import logging
from typing import Any, Dict, List, Optional

from langchain_core.embeddings import Embeddings

from app.database import get_supabase_client
from app.schemas import Citation

logger = logging.getLogger(__name__)


class ContextRetriever:
    """Retrieves relevant document chunks via vector similarity and extracts citations."""

    def __init__(self, embeddings_model: Embeddings, user_id: str):
        self.embeddings_model = embeddings_model
        self.user_id = user_id

    def retrieve_relevant_chunks(
        self,
        query: str,
        top_k: int = 4,
        document_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Fetches vector-similar document_chunks from Supabase filtered by user_id."""
        supabase = get_supabase_client()
        query_embedding = self.embeddings_model.embed_query(query)

        rpc_params = {
            "query_embedding": query_embedding,
            "match_count": top_k,
            "filter_user_id": self.user_id,
        }
        response = supabase.rpc("match_document_chunks", rpc_params).execute()
        results = response.data if response.data else []

        if document_ids:
            results = [r for r in results if r.get("document_id") in document_ids]

        return results

    @staticmethod
    def extract_citations(chunks: List[Dict[str, Any]]) -> List[Citation]:
        """Extracts structured Citation DTOs from retrieved document chunks."""
        citations: List[Citation] = []
        for chunk in chunks:
            metadata = chunk.get("metadata", {})
            citations.append(
                Citation(
                    filename=metadata.get("filename", "Unknown Document"),
                    page_number=metadata.get("page_number", 1),
                    content=chunk.get("content", "")[:200],
                )
            )
        return citations
