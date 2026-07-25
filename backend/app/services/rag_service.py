import logging
from collections.abc import AsyncIterable
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from fastapi.sse import ServerSentEvent
from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel

from app.database import get_supabase_client
from app.services.context_retriever import ContextRetriever
from app.services.llm_factory import LLMFactory
from app.services.prompt_builder import PromptBuilder

logger = logging.getLogger(__name__)


class RAGService:
    def __init__(
        self,
        user_id: str,
        llm: BaseChatModel,
        retriever: ContextRetriever,
    ):
        self.user_id = user_id
        self.llm = llm
        self.retriever = retriever

    async def generate_rag_stream(
        self,
        query: str,
        document_ids: Optional[List[str]] = None,
    ) -> AsyncIterable[ServerSentEvent]:
        # 1. Retrieve relevant chunks
        chunks = self.retriever.retrieve_relevant_chunks(
            query=query,
            document_ids=document_ids,
        )

        # 2. Extract & yield citations
        citations = ContextRetriever.extract_citations(chunks)
        citations_json = [c.model_dump() for c in citations]
        yield ServerSentEvent(data=citations_json, event="citations")

        full_response = ""

        # 3. Format prompt & stream tokens
        if not chunks:
            no_info_msg = PromptBuilder.NO_CONTEXT_MESSAGE
            full_response = no_info_msg
            yield ServerSentEvent(data={"token": no_info_msg}, event="token")
        else:
            prompt = PromptBuilder.format_context_prompt(query, chunks)

            async for chunk in self.llm.astream(prompt):
                token_content = chunk.content if hasattr(chunk, "content") else str(chunk)
                if token_content:
                    full_response += token_content
                    yield ServerSentEvent(data={"token": token_content}, event="token")

        # 4. Yield done
        yield ServerSentEvent(data={"status": "completed"}, event="done")

        # Store full_response for session persistence (accessed by router)
        self._last_response = full_response
        self._last_citations = citations_json

    @property
    def last_response(self) -> str:
        return getattr(self, "_last_response", "")

    @property
    def last_citations(self) -> List[Dict[str, Any]]:
        return getattr(self, "_last_citations", [])


def initialize_user_models(user_id: str, provider: Optional[str] = None) -> tuple[BaseChatModel, Embeddings]:
    supabase = get_supabase_client()

    # 1. Fetch User Provider Config
    provider_records: list = []
    if provider:
        matched_res = (
            supabase.table("user_provider_configs")
            .select("*")
            .eq("user_id", user_id)
            .eq("provider", provider)
            .execute()
        )
        provider_records = matched_res.data if matched_res.data else []

    if not provider_records:
        fallback_res = (
            supabase.table("user_provider_configs")
            .select("*")
            .eq("user_id", user_id)
            .order("is_default", desc=True)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        provider_records = fallback_res.data if fallback_res.data else []

    if not provider_records:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Konfigurasi AI Provider belum diatur. Silakan tambahkan API key Anda di menu Settings.",
        )

    llm = LLMFactory.get_llm_for_config(provider_records[0])

    # 2. Fetch User Embedding Config
    embedding_res = (
        supabase.table("user_embedding_configs")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )

    if not embedding_res.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Konfigurasi Model Embedding belum diatur. Silakan atur model embedding di menu Settings.",
        )

    embeddings_model = LLMFactory.get_embeddings_for_config(embedding_res.data[0])

    return llm, embeddings_model
