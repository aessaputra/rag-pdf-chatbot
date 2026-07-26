import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.auth import CurrentUserDep
from app.database import get_supabase_client
from app.schemas import (
    DocumentItemResponse,
    DocumentPreviewResponse,
    DocumentToggleRequest,
    DocumentUploadResponse,
)
from app.services.ingestion_service import PDFIngestionService
from app.services.storage_service import StorageService

router = APIRouter(
    prefix="/api/documents",
    tags=["Documents"],
)

logger = logging.getLogger(__name__)


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_pdf_document(
    user: CurrentUserDep,
    file: Annotated[UploadFile, File(...)],
    background_tasks: BackgroundTasks,
) -> DocumentUploadResponse:
    """
    Registers a PDF document and dispatches ingestion to a background task.

    Creates the document row in 'processing' state and uploads the PDF to
    Supabase Storage synchronously, then returns 201 immediately. Paragraph
    parsing, embedding, and vector storage run in the background; clients poll
    GET /api/documents to watch the status transition to 'ready' or 'failed'.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files (.pdf) are supported."
        )

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded PDF file is empty."
        )

    ingestion_service = PDFIngestionService()

    try:
        document = await run_in_threadpool(
            ingestion_service.register_document,
            file.filename,
            len(pdf_bytes),
            user.user_id,
            pdf_bytes,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal mendaftarkan dokumen: {e!s}"
        )

    background_tasks.add_task(
        ingestion_service.process_document,
        document_id=document["id"],
        user_id=user.user_id,
        filename=file.filename,
        pdf_bytes=pdf_bytes,
    )

    return DocumentUploadResponse(
        document_id=document["id"],
        filename=file.filename,
        file_size=len(pdf_bytes),
        total_pages=0,
        total_chunks=0,
        created_at=document["created_at"],
    )


@router.get("", response_model=list[DocumentItemResponse])
async def list_user_documents(user: CurrentUserDep) -> list[DocumentItemResponse]:
    def fetch_docs():
        supabase = get_supabase_client()
        res = (
            supabase.table("documents")
            .select("id, filename, file_size, total_pages, file_path, is_active, status, created_at")
            .eq("user_id", user.user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data if res.data else []

    data = await run_in_threadpool(fetch_docs)
    return [DocumentItemResponse(**doc) for doc in data]


@router.patch("/{document_id}/toggle", response_model=DocumentItemResponse)
async def toggle_document_active(
    document_id: str,
    body: DocumentToggleRequest,
    user: CurrentUserDep,
) -> DocumentItemResponse:
    def do_toggle():
        supabase = get_supabase_client()
        res = (
            supabase.table("documents")
            .update({"is_active": body.is_active})
            .eq("id", document_id)
            .eq("user_id", user.user_id)
            .execute()
        )
        if not res.data:
            return None
        return res.data[0]

    result = await run_in_threadpool(do_toggle)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
    return DocumentItemResponse(**result)


@router.get("/{document_id}/preview", response_model=DocumentPreviewResponse)
async def get_document_preview(
    document_id: str,
    user: CurrentUserDep,
) -> DocumentPreviewResponse:
    def fetch_and_sign():
        supabase = get_supabase_client()
        res = (
            supabase.table("documents")
            .select("id, file_path")
            .eq("id", document_id)
            .eq("user_id", user.user_id)
            .execute()
        )
        if not res.data:
            return None, None
        doc = res.data[0]
        file_path = doc.get("file_path")
        if not file_path:
            return doc, None
        signed_url = StorageService.create_signed_url(file_path)
        return doc, signed_url

    doc, signed_url = await run_in_threadpool(fetch_and_sign)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
    if signed_url is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not available in storage."
        )
    return DocumentPreviewResponse(document_id=document_id, signed_url=signed_url)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    user: CurrentUserDep,
) -> None:
    def remove_doc():
        supabase = get_supabase_client()
        # Fetch file_path before deletion
        res = (
            supabase.table("documents")
            .select("id, file_path")
            .eq("id", document_id)
            .eq("user_id", user.user_id)
            .execute()
        )
        if not res.data:
            return False

        file_path = res.data[0].get("file_path")

        # Delete from storage first
        if file_path:
            try:
                StorageService.delete_file(file_path)
            except Exception:
                logger.warning(
                    "Failed to delete storage file %s during document cleanup",
                    file_path,
                    exc_info=True,
                )

        # Delete from database (cascades to document_chunks)
        supabase.table("documents").delete().eq("id", document_id).eq("user_id", user.user_id).execute()
        return True

    found = await run_in_threadpool(remove_doc)
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
