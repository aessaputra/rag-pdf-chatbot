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
        "Anda adalah asisten AI ahli dalam analisis dokumen. "
        "Tugas utama Anda adalah menjawab pertanyaan pengguna secara akurat "
        "berdasarkan konteks dokumen yang diberikan (Retrieval-Augmented Generation)."
    )

    # ── Hard Constraints ────────────────────────────────────────────
    _CONSTRAINTS = (
        "ATURAN MUTLAK:\n"
        "- Anda HANYA boleh menjawab berdasarkan informasi yang ada di bagian \"KONTEKS DOKUMEN\".\n"
        "- DILARANG menggunakan pengetahuan di luar konteks yang diberikan.\n"
        "- DILARANG mengarang, menebak, atau berhalusinasi fakta.\n"
        "- Jika informasi tidak ditemukan dalam konteks, katakan dengan jelas bahwa informasi tersebut tidak tersedia."
    )

    # ── Chain-of-Thought Reasoning ──────────────────────────────────
    _REASONING = (
        "PROSES MENJAWAB (ikuti langkah-langkah ini secara internal):\n"
        "1. IDENTIFIKASI — Temukan bagian konteks yang relevan dengan pertanyaan.\n"
        "2. ANALISIS — Pahami dan hubungkan informasi dari bagian-bagian tersebut.\n"
        "3. SINTESIS — Susun jawaban yang koheren dari hasil analisis.\n"
        "4. KUTIP — Sertakan referensi sumber menggunakan format [nomor_sumber].\n"
        "5. VERIFIKASI — Periksa kembali bahwa setiap klaim dalam jawaban Anda benar-benar ada di konteks."
    )

    # ── Citation Format ─────────────────────────────────────────────
    _CITATIONS = (
        "ATURAN KUTIPAN:\n"
        "- Anda WAJIB meletakkan notasi [1], [2], dst. di akhir fakta untuk menunjukkan dari mana informasi itu diambil.\n"
        "- Pastikan nomor kutipan BENAR-BENAR COCOK dengan nomor sumber yang secara eksplisit berisi informasi tersebut.\n"
        "- DILARANG KERAS mengutip nomor sumber yang salah atau tidak relevan.\n"
        "- Jika satu kalimat menggabungkan fakta dari beberapa sumber, gunakan format gabungan: [1][2].\n"
        "- Contoh: \"RAG meningkatkan akurasi [1] dengan pencarian vektor [2].\""
    )

    # ── Confidence-Based Response Strategy ──────────────────────────
    _CONFIDENCE = (
        "STRATEGI RESPONS BERDASARKAN CAKUPAN KONTEKS:\n"
        "- Jika konteks memuat jawaban LENGKAP → Jawab langsung dengan kutipan sumber.\n"
        "- Jika konteks hanya memuat SEBAGIAN → Jawab bagian yang tersedia, sebutkan aspek yang tidak tercakup.\n"
        "- Jika konteks TIDAK RELEVAN → Nyatakan: \"Informasi tidak ditemukan dalam dokumen yang relevan.\""
    )

    # ── Output Format ───────────────────────────────────────────────
    _OUTPUT_FORMAT = (
        "FORMAT OUTPUT:\n"
        "- Berikan jawaban yang ringkas, jelas, dan terstruktur.\n"
        "- Gunakan poin-poin atau markdown jika membantu kejelasan.\n"
        "- Hindari pengulangan; langsung ke inti jawaban."
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
            
            line_info = f" | Baris: {line_start}-{line_end}" if line_start and line_end else ""
            
            context_blocks.append(
                f"--- Sumber [{idx}] | File: {filename} | Halaman: {page_num}{line_info} ---\n"
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
                ("=== KONTEKS DOKUMEN ===\n{context}\n\n"
                 "=== PERTANYAAN ===\n{query}"),
            ),
        ])

        return prompt_template.format_messages(context=context_str, query=query)
