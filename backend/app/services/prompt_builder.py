"""
Prompt Builder Module

Constructs structured RAG prompts by formatting retrieved context chunks
and user queries into a single prompt string for LLM consumption.
"""

from typing import Any, Dict, List


class PromptBuilder:
    """Formats query and context chunks into a structured RAG prompt for the LLM."""

    SYSTEM_INSTRUCTION = (
        "Anda adalah asisten AI cerdas berbasis RAG PDF Chatbot. "
        "Jawab pertanyaan berikut secara akurat dan ringkas berdasarkan informasi konteks dokumen PDF yang diberikan. "
        "Jika jawaban tidak ada dalam konteks, sampaikan bahwa informasi tidak ditemukan dalam dokumen."
    )

    NO_CONTEXT_MESSAGE = "Maaf, tidak ditemukan dokumen PDF yang relevan untuk menjawab pertanyaan ini."

    @staticmethod
    def format_context_prompt(query: str, chunks: List[Dict[str, Any]]) -> str:
        """Formats query and context chunks into a structured RAG prompt."""
        context_blocks = []
        for idx, chunk in enumerate(chunks, start=1):
            metadata = chunk.get("metadata", {})
            page_num = metadata.get("page_number", 1)
            filename = metadata.get("filename", "Doc")
            context_blocks.append(
                f"[{idx}] (File: {filename}, Page {page_num}):\n{chunk.get('content', '')}"
            )

        context_str = "\n\n".join(context_blocks)

        return (
            f"{PromptBuilder.SYSTEM_INSTRUCTION}\n\n"
            f"=== KONTEKS DOKUMEN ===\n{context_str}\n\n"
            f"=== PERTANYAAN ===\n{query}\n\n"
            "=== JAWABAN ==="
        )
