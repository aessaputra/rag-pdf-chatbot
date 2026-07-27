import inspect
import logging
import re
import uuid
from collections import Counter
from typing import Any

import fitz
import pymupdf4llm
from asyncer import asyncify
from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from app.database import execute_query, get_supabase_client
from app.schemas import DocumentChunkDTO
from app.services.enrichment_job_service import EnrichmentJobService
from app.services.rag_service import initialize_user_embeddings, initialize_user_llm
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

PARAGRAPH_DELIMITER = '\n\n'
QUESTIONS_PER_PARAGRAPH = 5
MAX_ENRICHED_PARAGRAPHS = 75

QUESTION_GENERATION_SYSTEM_PROMPT = (
    f"Generate {QUESTIONS_PER_PARAGRAPH} diverse questions that can be "
    "answered by this paragraph:\n\n{paragraph_content}\n\n"
    "Some simple query(s) in non-technical language. "
    "Some intermediate query(s) that require some reasoning. "
    "Some advanced query(s) that require deep understanding, using more technical words. "
    "Make sure the questions are clear and concise. "
    "Provide each question on a new line without headings. "
)


def is_retryable_error(exception: BaseException) -> bool:
    error_str = str(exception).lower()
    retryable_keywords = ["429", "rate limit", "resource_exhausted", "500", "502", "503", "504", "timeout"]
    return any(keyword in error_str for keyword in retryable_keywords)

class PDFIngestionService:
    def split_text_with_metadata(self, text: str, filename: str, page_number: int, boilerplate: frozenset[str] = frozenset()) -> list[DocumentChunkDTO]:
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
                    id=str(uuid.uuid4()),
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
        doc = fitz.Document(stream=pdf_bytes, filetype="pdf")
        md_pages = pymupdf4llm.to_markdown(doc, page_chunks=True)
        raw_pages_text = [page.get("text", "") for page in md_pages]
        
        boilerplate = self._identify_boilerplate_lines(raw_pages_text)
        all_chunks: list[DocumentChunkDTO] = []
        for page_index, page_text in enumerate(raw_pages_text):
            page_number = page_index + 1
            page_chunks = self.split_text_with_metadata(text=page_text, filename=filename, page_number=page_number, boilerplate=boilerplate)
            all_chunks.extend(page_chunks)
        return all_chunks

    @retry(
        retry=retry_if_exception(is_retryable_error),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        stop=stop_after_attempt(5)
    )
    async def generate_questions(self, paragraph_content: str, llm: BaseChatModel) -> list[str]:
        prompt = QUESTION_GENERATION_SYSTEM_PROMPT.format(paragraph_content=paragraph_content)
        response = await llm.ainvoke(prompt)
        raw_text = response.content if hasattr(response, 'content') else str(response)
        questions = self._parse_questions(raw_text)
        if not questions:
            raise ValueError('LLM did not produce valid synthetic questions.')
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

    async def register_document(self, filename: str, file_size: int, user_id: str, pdf_bytes: bytes) -> dict[str, Any]:
        supabase = await get_supabase_client()
        doc_data = {'user_id': user_id, 'filename': filename, 'file_size': file_size, 'total_pages': 0, 'status': 'processing', 'is_active': True}
        doc_response = await execute_query(supabase.table('documents').insert(doc_data))
        document_record = doc_response.data[0]
        document_id = document_record['id']
        try:
            file_path = await StorageService.upload_file(user_id, document_id, pdf_bytes)
        except Exception:
            await execute_query(supabase.table('documents').delete().eq('id', document_id).eq('user_id', user_id))
            raise
        await execute_query(supabase.table('documents').update({'file_path': file_path}).eq('id', document_id))
        document_record['file_path'] = file_path
        return document_record

    async def process_document(self, document_id: str, user_id: str, filename: str, pdf_bytes: bytes, batch_size: int = 100) -> None:
        supabase = await get_supabase_client()
        job_service = EnrichmentJobService()
        try:
            chunks = await asyncify(self.parse_pdf_bytes)(pdf_bytes, filename)
            if not chunks:
                raise ValueError('Could not extract readable text from PDF.')
            embeddings_model = await initialize_user_embeddings(user_id)
            await self._store_chunks(supabase, document_id, user_id, chunks, embeddings_model, batch_size)
            total_pages = max(chunk.page_number for chunk in chunks)
            await execute_query(supabase.table('documents').update({'status': 'ready', 'total_pages': total_pages}).eq('id', document_id))
            logger.info('Document %s processed: %d chunks stored.', document_id, len(chunks))
            try:
                preset = await job_service.get_user_preset(user_id)
                cap = job_service.get_preset_cap(preset)
                if cap > 0:
                    await job_service.create_job(
                        document_id=document_id,
                        user_id=user_id,
                        total_paragraphs=len([c for c in chunks if c.metadata.get('type') == 'paragraph']),
                    )
                    llm = await initialize_user_llm(user_id)
                    await self.enrich_document_questions(
                        supabase, document_id, user_id, chunks, llm, embeddings_model, batch_size, job_service, cap
                    )
            except Exception:
                logger.exception('Document %s question enrichment failed.', document_id)
        except Exception:
            logger.exception('Document %s processing failed.', document_id)
            await execute_query(supabase.table('documents').update({'status': 'failed'}).eq('id', document_id))

    async def enrich_document_questions(
        self,
        supabase: Any,
        document_id: str,
        user_id: str,
        chunks: list[DocumentChunkDTO],
        llm: BaseChatModel,
        embeddings_model: Embeddings,
        batch_size: int = 100,
        job_service: EnrichmentJobService | None = None,
        cap: int = MAX_ENRICHED_PARAGRAPHS,
    ) -> None:
        if job_service is None:
            job_service = EnrichmentJobService()

        await job_service.start_job(document_id, user_id)

        paragraph_chunks = job_service.select_paragraphs_by_quality(chunks, cap)
        total_paragraphs = len(paragraph_chunks)

        question_chunks: list[DocumentChunkDTO] = []
        processed_count = 0
        failed_count = 0

        for chunk in paragraph_chunks:
            try:
                questions = await self.generate_questions(chunk.content, llm)
                processed_count += 1
            except Exception as exc:
                logger.warning('Skipping question enrichment for chunk %s: %s', chunk.id, exc)
                failed_count += 1
                continue
            for question in questions:
                question_chunks.append(DocumentChunkDTO(
                    id=str(uuid.uuid4()),
                    parent_chunk_id=chunk.id,
                    content=chunk.content,
                    page_number=chunk.page_number,
                    filename=chunk.filename,
                    metadata={
                        **chunk.metadata,
                        'type': 'question',
                        'question': question,
                    },
                ))

            if processed_count % 10 == 0:
                await job_service.update_progress(
                    document_id=document_id,
                    user_id=user_id,
                    processed_paragraphs=processed_count,
                    question_chunks_created=len(question_chunks),
                )

        if question_chunks:
            await self._store_chunks(supabase, document_id, user_id, question_chunks, embeddings_model, batch_size)

        await job_service.complete_job(
            document_id=document_id,
            user_id=user_id,
            processed_paragraphs=processed_count,
            question_chunks_created=len(question_chunks),
        )

        logger.info(
            'Document %s enrichment completed: %d/%d paragraphs, %d questions, %d failed.',
            document_id, processed_count, total_paragraphs, len(question_chunks), failed_count
        )

    async def _store_chunks(self, supabase: Any, document_id: str, user_id: str, chunks: list[DocumentChunkDTO], embeddings_model: Embeddings, batch_size: int) -> None:
        chunk_texts = [chunk.metadata.get('question', chunk.content) if chunk.metadata.get('type') == 'question' else chunk.content for chunk in chunks]
        async_embed_documents = getattr(embeddings_model, 'aembed_documents', None)
        if async_embed_documents:
            async_result = async_embed_documents(chunk_texts)
            if inspect.isawaitable(async_result):
                vector_embeddings = await async_result
            elif isinstance(async_result, list):
                vector_embeddings = async_result
            else:
                vector_embeddings = await asyncify(embeddings_model.embed_documents)(chunk_texts)
        else:
            vector_embeddings = await asyncify(embeddings_model.embed_documents)(chunk_texts)
        chunk_records = []
        for chunk, embedding_vector in zip(chunks, vector_embeddings):
            chunk_records.append({
                'id': chunk.id,
                'parent_chunk_id': chunk.parent_chunk_id,
                'document_id': document_id, 
                'user_id': user_id, 
                'content': chunk.content, 
                'page_number': chunk.page_number, 
                'metadata': chunk.metadata, 
                'embedding': embedding_vector
            })
        for i in range(0, len(chunk_records), batch_size):
            batch = chunk_records[i:i + batch_size]
            await execute_query(supabase.table('document_chunks').insert(batch))

