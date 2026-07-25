import io
import re
from collections import Counter
from datetime import datetime, timezone

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from app.database import get_supabase_client
from app.schemas import DocumentChunkDTO, DocumentUploadResponse
from app.services.llm_factory import LLMFactory


class PDFIngestionService:

    def __init__(self, chunk_size: int=1000, chunk_overlap: int=200):
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap, separators=['\n\n', '\n', ' ', ''])

    def split_text_with_metadata(self, text: str, filename: str, page_number: int) -> list[DocumentChunkDTO]:
        cleaned_text = text.strip()
        if not cleaned_text:
            return []
        doc = Document(page_content=cleaned_text, metadata={'filename': filename, 'page_number': page_number})
        split_docs = self.text_splitter.split_documents([doc])
        return [DocumentChunkDTO(content=chunk.page_content, page_number=chunk.metadata['page_number'], filename=chunk.metadata['filename'], metadata=chunk.metadata) for chunk in split_docs]

    def _identify_boilerplate_lines(self, pages_text: list[str]) -> set:
        if len(pages_text) <= 2:
            return set()
        line_counts = Counter()
        for text in pages_text:
            lines = {line.strip() for line in text.split('\n') if len(line.strip()) > 5}
            for line in lines:
                line_counts[line] += 1
        threshold = len(pages_text) * 0.5
        return {line for line, count in line_counts.items() if count >= threshold}

    def _clean_boilerplate(self, pages_text: list[str]) -> list[str]:
        boilerplate = self._identify_boilerplate_lines(pages_text)
        cleaned_pages = []
        for text in pages_text:
            cleaned_lines = []
            for line in text.split('\n'):
                stripped = line.strip()
                if stripped in boilerplate:
                    continue
                if re.match('^(page|hal|halaman)[:\\s\\-0-9]+$', stripped, re.IGNORECASE):
                    continue
                cleaned_lines.append(line)
            cleaned_pages.append('\n'.join(cleaned_lines))
        return cleaned_pages

    def parse_pdf_bytes(self, pdf_bytes: bytes, filename: str) -> list[DocumentChunkDTO]:
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
        raw_pages_text = [page.extract_text() or '' for page in pdf_reader.pages]
        cleaned_pages_text = self._clean_boilerplate(raw_pages_text)
        all_chunks: list[DocumentChunkDTO] = []
        for current_index, current_text in enumerate(cleaned_pages_text):
            page_number = current_index + 1
            has_next_page = current_index + 1 < len(cleaned_pages_text)
            if has_next_page:
                next_page_text = cleaned_pages_text[current_index + 1]
                overlap_chars = getattr(self.text_splitter, '_chunk_overlap', 200)
                remainder = next_page_text[overlap_chars:]
                match = re.search('[.!?\\n]', remainder)
                if match:
                    safe_index = overlap_chars + match.end()
                else:
                    space_match = re.search('\\s', remainder)
                    safe_index = overlap_chars + space_match.end() if space_match else overlap_chars
                overlap_text = next_page_text[:safe_index].strip()
                current_text = f'{current_text} {overlap_text}'
            page_chunks = self.split_text_with_metadata(text=current_text, filename=filename, page_number=page_number)
            all_chunks.extend(page_chunks)
        return all_chunks

    def store_document_and_chunks(self, filename: str, file_size: int, user_id: str, chunks: list[DocumentChunkDTO], total_pages: int, pdf_bytes: bytes, provider: str='gemini', batch_size: int=100) -> DocumentUploadResponse:
        from app.services.storage_service import StorageService
        supabase = get_supabase_client()
        doc_data = {'user_id': user_id, 'filename': filename, 'file_size': file_size, 'total_pages': total_pages, 'status': 'processing', 'is_active': True}
        doc_response = supabase.table('documents').insert(doc_data).execute()
        document_id = doc_response.data[0]['id']
        try:
            file_path = StorageService.upload_file(user_id, document_id, pdf_bytes)
        except Exception:
            supabase.table('documents').delete().eq('id', document_id).eq('user_id', user_id).execute()
            raise
        supabase.table('documents').update({'file_path': file_path}).eq('id', document_id).execute()
        try:
            embedding_res = supabase.table('user_embedding_configs').select('*').eq('user_id', user_id).execute()
            if not embedding_res.data:
                raise ValueError('Konfigurasi Model Embedding belum diatur. Silakan atur model embedding di menu Settings.')
            embedding_config = embedding_res.data[0]
            embeddings_model = LLMFactory.get_embeddings_for_config(embedding_config)
            chunk_texts = [chunk.content for chunk in chunks]
            vector_embeddings = embeddings_model.embed_documents(chunk_texts)
            chunk_records = []
            for chunk, embedding_vector in zip(chunks, vector_embeddings):
                chunk_records.append({'document_id': document_id, 'user_id': user_id, 'content': chunk.content, 'page_number': chunk.page_number, 'metadata': chunk.metadata, 'embedding': embedding_vector})
            for i in range(0, len(chunk_records), batch_size):
                batch = chunk_records[i:i + batch_size]
                supabase.table('document_chunks').insert(batch).execute()
            supabase.table('user_embedding_configs').update({'locked': True}).eq('user_id', user_id).execute()
            supabase.table('documents').update({'status': 'ready'}).eq('id', document_id).execute()
        except Exception:
            supabase.table('documents').update({'status': 'failed'}).eq('id', document_id).execute()
            raise
        return DocumentUploadResponse(document_id=document_id, filename=filename, file_size=file_size, total_pages=total_pages, total_chunks=len(chunks), created_at=datetime.now(timezone.utc))
