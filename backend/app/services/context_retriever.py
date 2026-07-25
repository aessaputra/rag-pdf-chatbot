import logging
from typing import Any

from langchain_core.embeddings import Embeddings

from app.database import get_supabase_client
from app.schemas import Citation

logger = logging.getLogger(__name__)

class ContextRetriever:

    def __init__(self, embeddings_model: Embeddings, user_id: str):
        self.embeddings_model = embeddings_model
        self.user_id = user_id

    def retrieve_relevant_chunks(self, query: str, top_k: int=4, fetch_k: int=20, lambda_mult: float=0.5, document_ids: list[str] | None=None) -> list[dict[str, Any]]:
        supabase = get_supabase_client()
        query_embedding = self.embeddings_model.embed_query(query)
        rpc_params = {'query_embedding': query_embedding, 'match_count': fetch_k, 'filter_user_id': self.user_id}
        response = supabase.rpc('match_document_chunks', rpc_params).execute()
        results = response.data if response.data else []
        if document_ids:
            results = [r for r in results if r.get('document_id') in document_ids]
        if not results:
            return []
        if 'embedding' not in results[0]:
            logger.warning("RPC 'match_document_chunks' did not return 'embedding'. Falling back to Dense Retrieval without MMR.")
            return results[:top_k]
        import numpy as np
        from langchain_community.vectorstores.utils import maximal_marginal_relevance

        def parse_embedding(emb: Any) -> list[float]:
            if isinstance(emb, str):
                import json
                return json.loads(emb)
            return emb
        candidate_embeddings = [parse_embedding(r['embedding']) for r in results]
        mmr_indices = maximal_marginal_relevance(np.array(query_embedding), candidate_embeddings, k=top_k, lambda_mult=lambda_mult)
        return [results[i] for i in mmr_indices]

    @staticmethod
    def extract_citations(chunks: list[dict[str, Any]]) -> list[Citation]:
        citations: list[Citation] = []
        for chunk in chunks:
            metadata = chunk.get('metadata', {})
            citations.append(Citation(filename=metadata.get('filename', 'Unknown Document'), page_number=metadata.get('page_number', 1), content=chunk.get('content', '')[:200]))
        return citations
