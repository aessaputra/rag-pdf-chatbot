"""
Prompt Builder Module

Constructs structured RAG prompts by formatting retrieved context chunks
and user queries into optimized prompt messages for LLM consumption.

Applies the following prompt engineering patterns:
- Role-Based System Prompts: Structured identity, constraints, and output format.
- Chain-of-Thought (CoT): Step-by-step reasoning guidance.
- Self-Verification: Post-answer verification against context.
- Confidence-Based Response: Tiered response strategy based on context coverage.
- Progressive Context Formatting: Clear visual separators per source chunk.
"""

from typing import Any

from langchain_core.messages import BaseMessage
from langchain_core.prompts import ChatPromptTemplate


class PromptBuilder:
    """Formats query and context chunks into an optimized RAG prompt for the LLM.

    Uses role-based system prompts with chain-of-thought reasoning guidance
    and self-verification instructions to improve answer accuracy and citation quality.
    """

    # ── Role & Identity ─────────────────────────────────────────────
    _ROLE = (
        "You are an expert AI assistant specializing in document analysis. "
        "Your main task is to accurately answer user questions "
        "based strictly on the provided document context (Retrieval-Augmented Generation)."
    )

    # ── Hard Constraints ────────────────────────────────────────────
    _CONSTRAINTS = (
        "ABSOLUTE RULES:\n"
        "- You MUST answer ONLY based on the information provided in the \"DOCUMENT CONTEXT\" section.\n"
        "- DO NOT use any outside knowledge.\n"
        "- DO NOT make up, guess, or hallucinate facts.\n"
        "- If the information is not found in the context, state clearly that the information is not available."
    )

    # ── Chain-of-Thought Reasoning ──────────────────────────────────
    _REASONING = (
        "REASONING PROCESS (follow internally):\n"
        "1. IDENTIFY — Find the parts of the context relevant to the question.\n"
        "2. ANALYZE — Understand and connect the information from those parts.\n"
        "3. SYNTHESIZE — Formulate a coherent answer from the analysis.\n"
        "4. CITE — Include source references using the [source_number] format.\n"
        "5. VERIFY — Double-check that every claim in your answer exists in the context."
    )

    # ── Citation Format ─────────────────────────────────────────────
    _CITATIONS = (
        "CITATION RULES:\n"
        "- You MUST append citation markers like [1], [2], etc. at the end of every factual statement to indicate its source.\n"
        "- Ensure the citation number EXACTLY MATCHES the source number that explicitly contains the information.\n"
        "- STRICTLY PROHIBITED to cite incorrect or irrelevant source numbers.\n"
        "- If a sentence combines facts from multiple sources, use a combined format: [1][2].\n"
        "- Example: \"RAG improves accuracy [1] with vector search [2].\""
    )

    # ── Confidence-Based Response Strategy ──────────────────────────
    _CONFIDENCE = (
        "CONFIDENCE-BASED RESPONSE STRATEGY:\n"
        "- FULL context coverage → Answer directly with source citations.\n"
        "- PARTIAL context coverage → Answer what is available, and state which aspects are missing.\n"
        "- NO RELEVANT context → State: \"Information not found in the relevant documents.\""
    )

    # ── Output Format ───────────────────────────────────────────────
    _OUTPUT_FORMAT = (
        "OUTPUT FORMAT:\n"
        "- Provide a concise, clear, and structured answer.\n"
        "- Use bullet points or markdown if it helps clarity.\n"
        "- Avoid repetition; get straight to the point.\n"
        "- CRITICAL: You MUST respond in the EXACT SAME LANGUAGE as the user's QUESTION."
    )

    # ── Composed System Instruction ─────────────────────────────────
    SYSTEM_INSTRUCTION = f"{_ROLE}\n\n{_CONSTRAINTS}\n\n{_REASONING}\n\n{_CITATIONS}\n\n{_CONFIDENCE}\n\n{_OUTPUT_FORMAT}"

    NO_CONTEXT_MESSAGE = "Maaf, tidak ditemukan dokumen yang relevan untuk menjawab pertanyaan ini."

    @staticmethod
    def _build_context_string(chunks: list[dict[str, Any]]) -> str:
        """Formats raw chunks into a visually separated context string.

        Each chunk is labeled with a source number, filename, and page number
        using clear visual separators for improved LLM comprehension.

        Args:
            chunks: List of chunk dicts with 'content' and 'metadata' keys.

        Returns:
            Formatted context string with labeled source blocks.
        """
        context_blocks: list[str] = []
        for idx, chunk in enumerate(chunks, start=1):
            metadata = chunk.get("metadata", {})
            page_num = metadata.get("page_number", 1)
            filename = metadata.get("filename", "Doc")
            line_start = metadata.get("line_start")
            line_end = metadata.get("line_end")
            content = chunk.get("content", "")
            
            line_info = f" | Lines: {line_start}-{line_end}" if line_start and line_end else ""
            
            context_blocks.append(
                f"--- Source [{idx}] | File: {filename} | Page: {page_num}{line_info} ---\n"
                f"{content}"
            )
        return "\n\n".join(context_blocks)

    @staticmethod
    def format_context_prompt(
        query: str,
        chunks: list[dict[str, Any]],
    ) -> list[BaseMessage]:
        """Formats query and context chunks into structured RAG prompt messages.

        Applies role-based system prompts with chain-of-thought reasoning
        and self-verification to maximize LLM answer quality.

        Args:
            query: The user's question.
            chunks: Retrieved document chunks with content and metadata.

        Returns:
            List of LangChain BaseMessage objects ready for LLM consumption.
        """
        context_str = PromptBuilder._build_context_string(chunks)

        prompt_template = ChatPromptTemplate.from_messages([
            ("system", PromptBuilder.SYSTEM_INSTRUCTION),
            (
                "user",
                ("=== DOCUMENT CONTEXT ===\n{context}\n\n"
                 "=== QUESTION ===\n{query}"),
            ),
        ])

        return prompt_template.format_messages(context=context_str, query=query)
