import io
import logging
import re
from collections import Counter
from typing import Any

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel
from pypdf import PdfReader
from supabase import Client

from app.database import get_supabase_client
from app.schemas import DocumentChunkDTO
from app.services.rag_service import initialize_user_models
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

PARAGRAPH_DELIMITER = '\n\n'
QUESTIONS_PER_PARAGRAPH = 5

QUESTION_GENERATION_SYSTEM_PROMPT = (
    'Anda adalah asisten yang membangun indeks pencarian dokumen.\n'
    f'Buat TEPAT {QUESTIONS_PER_PARAGRAPH} pertanyaan berbeda yang jawabannya terdapat '
    'dalam paragraf yang diberikan pengguna.\n'
    'Tulis setiap pertanyaan pada baris baru, diawali nomor urut (1., 2., ...).\n'
    'Jawab HANYA dengan daftar pertanyaan, tanpa penjelasan tambahan.'
)


class PDFIngestionService:
    """Orchestrates PDF parsing, paragraph chunking, and asynchronous ingestion.

    Splits page text into paragraphs delimited by blank lines, generates
    synthetic HyDE questions per paragraph via the user's LLM, embeds all
    chunks, and stores them in Supabase pgvector. Designed to run the heavy
    pipeline in a background task so the upload endpoint returns promptly.
    """

    def split_text_with_metadata(self, text: str, filename: str, page_number: int, boilerplate: frozenset[str] = frozenset()) -> list[DocumentChunkDTO]:
        """Splits page text into natural paragraphs with exact 1-indexed line spans.

        Paragraphs are delimited by blank lines. Boilerplate lines are dropped
        from paragraph content without renumbering, so line spans always refer
        to the raw extracted page text that citations are verified against.
        """
        cleaned_text = text.strip()
        if not cleaned_text:
            return []
        chunks: list[DocumentChunkDTO] = []
        current_line = 1
        for segment in cleaned_text.split(PARAGRAPH_DELIMITER):
            segment_line_span = segment.count('\n') + 1
            leading_blank_lines = len(segment) - len(segment.lstrip('\n'))
            block_start = current_line + leading_blank_lines
            kept_lines = [
                (offset, line)
                for offset, line in enumerate(segment.lstrip('\n').split('\n'))
                if not self._is_removable_line(line, boilerplate)
            ]
            if kept_lines and ''.join(line for _, line in kept_lines).strip():
                chunks.append(DocumentChunkDTO(
                    content='\n'.join(line for _, line in kept_lines).strip(),
                    page_number=page_number,
                    filename=filename,
                    metadata={
                        'filename': filename,
                        'page_number': page_number,
                        'line_start': block_start + kept_lines[0][0],
                        'line_end': block_start + kept_lines[-1][0],
                        'type': 'paragraph',
                    },
                ))
            current_line += segment_line_span + 1
        return chunks

    @staticmethod
    def _is_removable_line(line: str, boilerplate: frozenset[str]) -> bool:
        stripped = line.strip()
        if not stripped:
            return False
        if stripped in boilerplate:
            return True
        return bool(re.match('^(page|hal|halaman)[:\\s\\-0-9]+$', stripped, re.IGNORECASE))

    def _identify_boilerplate_lines(self, pages_text: list[str]) -> frozenset[str]:
        if len(pages_text) <= 2:
            return frozenset()
        line_counts = Counter()
        for text in pages_text:
            lines = {line.strip() for line in text.split('\n') if len(line.strip()) > 5}
            for line in lines:
                line_counts[line] += 1
        threshold = len(pages_text) * 0.5
        return frozenset(line for line, count in line_counts.items() if count >= threshold)

    def parse_pdf_bytes(self, pdf_bytes: bytes, filename: str) -> list[DocumentChunkDTO]:
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
        raw_pages_text = [page.extract_text() or '' for page in pdf_reader.pages]
        boilerplate = self._identify_boilerplate_lines(raw_pages_text)
        all_chunks: list[DocumentChunkDTO] = []
        for page_index, page_text in enumerate(raw_pages_text):
            page_number = page_index + 1
            page_chunks = self.split_text_with_metadata(text=page_text, filename=filename, page_number=page_number, boilerplate=boilerplate)
            all_chunks.extend(page_chunks)
        return all_chunks

    def generate_questions(self, paragraph_content: str, llm: BaseChatModel) -> list[str]:
        """Generates up to QUESTIONS_PER_PARAGRAPH synthetic HyDE questions via the user's LLM.

        The prompt asks for exactly QUESTIONS_PER_PARAGRAPH questions; the
        parser tolerates messy output (preambles, bullets, quotes, extras)
        and returns at most QUESTIONS_PER_PARAGRAPH. Raises ValueError when
        nothing parseable comes back, which callers treat as a generation
        failure.
        """
        response = llm.invoke([
            ('system', QUESTION_GENERATION_SYSTEM_PROMPT),
            ('user', paragraph_content),
        ])
        raw_text = response.content if hasattr(response, 'content') else str(response)
        questions = self._parse_questions(raw_text)
        if not questions:
            raise ValueError('LLM tidak menghasilkan pertanyaan sintetis yang valid.')
        return questions[:QUESTIONS_PER_PARAGRAPH]

    @staticmethod
    def _parse_questions(raw_text: str) -> list[str]:
        questions: list[str] = []
        for line in raw_text.splitlines():
            stripped = re.sub(r'^\s*\d+[\.\)\:\-]\s*', '', line)
            stripped = re.sub(r'^\s*[\-\*\u2022]\s*', '', stripped)
            stripped = stripped.strip().strip('"').strip()
            if not stripped or stripped.endswith(':'):
                continue
            questions.append(stripped)
        return questions

    def register_document(self, filename: str, file_size: int, user_id: str, pdf_bytes: bytes) -> dict[str, Any]:
        """Creates the document row in 'processing' state and uploads the PDF to storage.

        Runs synchronously during the upload request so the client immediately
        gets a trackable document record. Rolls the row back if the storage
        upload fails.
        """
        supabase = get_supabase_client()
        doc_data = {'user_id': user_id, 'filename': filename, 'file_size': file_size, 'total_pages': 0, 'status': 'processing', 'is_active': True}
        doc_response = supabase.table('documents').insert(doc_data).execute()
        document_record = doc_response.data[0]
        document_id = document_record['id']
        try:
            file_path = StorageService.upload_file(user_id, document_id, pdf_bytes)
        except Exception:
            supabase.table('documents').delete().eq('id', document_id).eq('user_id', user_id).execute()
            raise
        supabase.table('documents').update({'file_path': file_path}).eq('id', document_id).execute()
        document_record['file_path'] = file_path
        return document_record

    def process_document(self, document_id: str, user_id: str, filename: str, pdf_bytes: bytes, batch_size: int = 100) -> None:
        """Runs the ingestion pipeline for a registered document in the background.

        Parses paragraphs, generates QUESTIONS_PER_PARAGRAPH synthetic
        questions per paragraph (HyDE), embeds all chunks, stores them,
        locks the embedding config, and marks the document 'ready'. LLM
        provider rate limits and other failures are logged and result in a
        'failed' status instead of raising, since this runs as a
        fire-and-forget background task.
        """
        supabase = get_supabase_client()
        try:
            chunks = self.parse_pdf_bytes(pdf_bytes, filename)
            if not chunks:
                raise ValueError('Could not extract readable text from PDF.')
            llm, embeddings_model = initialize_user_models(user_id)
            expanded_chunks = self._attach_synthetic_questions(chunks, llm)
            self._store_chunks(supabase, document_id, user_id, expanded_chunks, embeddings_model, batch_size)
            supabase.table('user_embedding_configs').update({'locked': True}).eq('user_id', user_id).execute()
            total_pages = max(chunk.page_number for chunk in chunks)
            supabase.table('documents').update({'status': 'ready', 'total_pages': total_pages}).eq('id', document_id).execute()
            logger.info('Document %s processed: %d chunks stored (%d paragraphs).', document_id, len(expanded_chunks), len(chunks))
        except Exception:
            logger.exception('Document %s processing failed.', document_id)
            supabase.table('documents').update({'status': 'failed'}).eq('id', document_id).execute()

    def _attach_synthetic_questions(self, chunks: list[DocumentChunkDTO], llm: BaseChatModel) -> list[DocumentChunkDTO]:
        """Expands paragraph chunks with their synthetic question chunks.

        Question chunks share the paragraph's location metadata and carry the
        original paragraph text in 'paragraph_content' so retrieval can swap
        the matched question back to the real context.
        """
        expanded: list[DocumentChunkDTO] = []
        for chunk in chunks:
            expanded.append(chunk)
            for question in self.generate_questions(chunk.content, llm):
                expanded.append(DocumentChunkDTO(
                    content=question,
                    page_number=chunk.page_number,
                    filename=chunk.filename,
                    metadata={
                        **chunk.metadata,
                        'type': 'question',
                        'paragraph_content': chunk.content,
                    },
                ))
        return expanded

    def _store_chunks(self, supabase: Client, document_id: str, user_id: str, chunks: list[DocumentChunkDTO], embeddings_model: Embeddings, batch_size: int) -> None:
        chunk_texts = [chunk.content for chunk in chunks]
        vector_embeddings = embeddings_model.embed_documents(chunk_texts)
        chunk_records = []
        for chunk, embedding_vector in zip(chunks, vector_embeddings):
            chunk_records.append({'document_id': document_id, 'user_id': user_id, 'content': chunk.content, 'page_number': chunk.page_number, 'metadata': chunk.metadata, 'embedding': embedding_vector})
        for i in range(0, len(chunk_records), batch_size):
            batch = chunk_records[i:i + batch_size]
            supabase.table('document_chunks').insert(batch).execute()

