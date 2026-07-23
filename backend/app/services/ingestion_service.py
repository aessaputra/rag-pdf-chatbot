"""
PDF Ingestion Service Module

Handles parsing PDF raw bytes, text chunking with metadata annotations, embedding generation,
and Supabase batch insertion following performance best practices.
"""

import io
from datetime import datetime, timezone
from typing import Any, Dict, List
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.database import get_supabase_client
from app.schemas import DocumentChunkDTO, DocumentUploadResponse
from app.services.llm_factory import LLMFactory


class PDFIngestionService:
    """Service responsible for PDF processing, text chunking, and batch vector storage."""

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""]
        )

    def split_text_with_metadata(
        self, text: str, filename: str, page_number: int
    ) -> List[DocumentChunkDTO]:
        """Splits raw page text into annotated DocumentChunkDTOs."""
        cleaned_text = text.strip()
        if not cleaned_text:
            return []

        raw_chunks = self.text_splitter.split_text(cleaned_text)
        annotated_chunks: List[DocumentChunkDTO] = []

        for chunk_text in raw_chunks:
            metadata: Dict[str, Any] = {
                "filename": filename,
                "page_number": page_number,
            }
            annotated_chunks.append(
                DocumentChunkDTO(
                    content=chunk_text,
                    page_number=page_number,
                    filename=filename,
                    metadata=metadata
                )
            )

        return annotated_chunks

    def parse_pdf_bytes(self, pdf_bytes: bytes, filename: str) -> List[DocumentChunkDTO]:
        """Reads raw PDF bytes and returns all annotated text chunks across pages."""
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
        all_chunks: List[DocumentChunkDTO] = []

        for page_index, page in enumerate(pdf_reader.pages, start=1):
            page_text = page.extract_text() or ""
            page_chunks = self.split_text_with_metadata(
                text=page_text,
                filename=filename,
                page_number=page_index
            )
            all_chunks.extend(page_chunks)

        return all_chunks

    def store_document_and_chunks(
        self,
        filename: str,
        file_size: int,
        user_id: str,
        chunks: List[DocumentChunkDTO],
        total_pages: int,
        provider: str = "gemini",
        batch_size: int = 100
    ) -> DocumentUploadResponse:
        """
        Inserts document record and batch-inserts vector chunks into Supabase PostgreSQL.
        """
        supabase = get_supabase_client()

        # 1. Insert Document record
        doc_data = {
            "user_id": user_id,
            "filename": filename,
            "file_size": file_size,
            "total_pages": total_pages
        }
        doc_response = supabase.table("documents").insert(doc_data).execute()
        document_id = doc_response.data[0]["id"]

        # 2. Generate Embeddings for all chunks
        embeddings_model = LLMFactory.get_embeddings(provider)
        chunk_texts = [chunk.content for chunk in chunks]
        vector_embeddings = embeddings_model.embed_documents(chunk_texts)

        # 3. Prepare Batch Records for document_chunks
        chunk_records = []
        for chunk, embedding_vector in zip(chunks, vector_embeddings):
            chunk_records.append({
                "document_id": document_id,
                "user_id": user_id,
                "content": chunk.content,
                "page_number": chunk.page_number,
                "metadata": chunk.metadata,
                "embedding": embedding_vector
            })

        # 4. Perform Batch Insert (Supabase Data Access Best Practice)
        for i in range(0, len(chunk_records), batch_size):
            batch = chunk_records[i : i + batch_size]
            supabase.table("document_chunks").insert(batch).execute()

        return DocumentUploadResponse(
            document_id=document_id,
            filename=filename,
            file_size=file_size,
            total_pages=total_pages,
            total_chunks=len(chunks),
            created_at=datetime.now(timezone.utc)
        )
