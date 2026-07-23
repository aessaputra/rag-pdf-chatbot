/**
 * API Client & SSE Stream Reader Module
 * Handles REST requests to FastAPI backend and decodes Server-Sent Events (SSE).
 */

import type { ApiResponse, Citation, DocumentItem } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Fetches SSE token and citation stream from POST /api/chat/stream.
 */
export async function fetchSSEStream(
  query: string,
  token: string,
  provider: string,
  documentIds: string[] | undefined,
  onCitations: (citations: Citation[]) => void,
  onToken: (tokenText: string) => void,
  onComplete: () => void,
  onError: (errorMsg: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        provider,
        document_ids: documentIds && documentIds.length > 0 ? documentIds : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      onError(`Error HTTP ${response.status}: ${errorText || 'Gagal mengambil jawaban AI.'}`);
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) {
      onError('Respons stream tidak didukung oleh browser.');
      return;
    }

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const eventBlock of events) {
        if (eventBlock.startsWith('event: citations')) {
          const jsonStr = eventBlock.replace('event: citations\ndata: ', '').trim();
          if (jsonStr) {
            try {
              const citations: Citation[] = JSON.parse(jsonStr);
              onCitations(citations);
            } catch (err) {
              console.error('Failed to parse citations SSE json', err);
            }
          }
        } else if (eventBlock.startsWith('event: token')) {
          const jsonStr = eventBlock.replace('event: token\ndata: ', '').trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              if (data.token) {
                onToken(data.token);
              }
            } catch (err) {
              console.error('Failed to parse token SSE json', err);
            }
          }
        }
      }
    }

    onComplete();
  } catch (err: any) {
    onError(err.message || 'Terjadi kesalahan jaringan.');
  }
}

/** Uploads a PDF file to POST /api/documents/upload */
export async function uploadDocument(file: File, token: string): Promise<ApiResponse<any>> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errJson = await response.json();
      return { success: false, data: null, error: errJson.detail || 'Gagal mengunggah PDF.' };
    }

    const data = await response.json();
    return { success: true, data, error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

/** Retrieves all uploaded user documents from GET /api/documents */
export async function listDocuments(token: string): Promise<ApiResponse<DocumentItem[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { success: false, data: null, error: 'Gagal mengambil daftar dokumen.' };
    }

    const data: DocumentItem[] = await response.json();
    return { success: true, data, error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

/** Deletes a user document via DELETE /api/documents/{id} */
export async function deleteDocument(documentId: string, token: string): Promise<ApiResponse<boolean>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { success: false, data: null, error: 'Gagal menghapus dokumen.' };
    }

    return { success: true, data: true, error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}
