import type { ApiResponse, Citation, DocumentItem } from '@/types';
import { createClient } from '@/lib/supabaseClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Retrieves a fresh access token from the Supabase session and returns
 * the Authorization headers for API requests.
 *
 * Falls back to the provided token if session refresh fails.
 */
async function getAuthHeaders(fallbackToken?: string): Promise<Record<string, string>> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token ?? fallbackToken;

  if (!token) {
    throw new Error('Sesi login telah berakhir. Silakan login kembali.');
  }

  return { Authorization: `Bearer ${token}` };
}

async function extractErrorDetail(response: Response, fallback: string): Promise<string> {
  try {
    const text = await response.text();
    if (!text.trim()) return `Error HTTP ${response.status}: ${fallback}`;

    try {
      const json = JSON.parse(text);
      const detail = json.detail || json.message || json.error;
      if (detail) return typeof detail === 'string' ? detail : JSON.stringify(detail);
    } catch { /* non-JSON body */ }

    return `Error HTTP ${response.status}: ${text.substring(0, 200)}`;
  } catch {
    return `Error HTTP ${response.status}: ${fallback}`;
  }
}

function isNetworkError(message: string): boolean {
  return message.includes('Failed to fetch') || message.includes('NetworkError');
}

// --- SSE Stream ---

export interface SSEStreamCallbacks {
  onCitations: (citations: Citation[]) => void;
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (message: string) => void;
}

export async function fetchSSEStream(
  query: string,
  token: string,
  provider: string,
  documentIds: string[] | undefined,
  callbacks: SSEStreamCallbacks
): Promise<void> {
  try {
    const headers = await getAuthHeaders(token);

    const response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        query,
        provider,
        document_ids: documentIds?.length ? documentIds : undefined,
      }),
    });

    if (!response.ok) {
      callbacks.onError(await extractErrorDetail(response, 'Gagal mengambil jawaban AI.'));
      return;
    }

    await consumeSSEStream(response, callbacks);
    callbacks.onComplete();
  } catch (err: any) {
    callbacks.onError(err.message || 'Terjadi kesalahan jaringan.');
  }
}

async function consumeSSEStream(response: Response, callbacks: SSEStreamCallbacks) {
  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError('Respons stream tidak didukung oleh browser.');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const block of events) {
      parseSSEEvent(block, callbacks);
    }
  }
}

function parseSSEEvent(block: string, callbacks: SSEStreamCallbacks) {
  try {
    if (block.startsWith('event: citations')) {
      const json = block.replace('event: citations\ndata: ', '').trim();
      if (json) callbacks.onCitations(JSON.parse(json));
    } else if (block.startsWith('event: token')) {
      const json = block.replace('event: token\ndata: ', '').trim();
      if (json) {
        const data = JSON.parse(json);
        if (data.token) callbacks.onToken(data.token);
      }
    }
  } catch (err) {
    console.error('SSE parse error:', err);
  }
}

// --- Document CRUD ---

export async function uploadDocument(file: File, token: string): Promise<ApiResponse<any>> {
  try {
    const headers = await getAuthHeaders(token);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/api/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal mengunggah PDF.') };
    }

    return { success: true, data: await response.json(), error: null };
  } catch (err: any) {
    const message = err.message || '';
    if (isNetworkError(message)) {
      return { success: false, data: null, error: `Gagal terhubung ke server backend di ${API_BASE}` };
    }
    return { success: false, data: null, error: message || 'Terjadi kesalahan jaringan.' };
  }
}

export async function listDocuments(token: string): Promise<ApiResponse<DocumentItem[]>> {
  try {
    const headers = await getAuthHeaders(token);

    const response = await fetch(`${API_BASE}/api/documents`, { headers });

    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal mengambil daftar dokumen.') };
    }

    return { success: true, data: await response.json(), error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

export async function deleteDocument(documentId: string, token: string): Promise<ApiResponse<boolean>> {
  try {
    const headers = await getAuthHeaders(token);

    const response = await fetch(`${API_BASE}/api/documents/${documentId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal menghapus dokumen.') };
    }

    return { success: true, data: true, error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}
