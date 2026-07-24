import type { ApiResponse, Citation, DocumentItem, DocumentPreviewResponse, ProviderConfig, EmbeddingConfig, EmbeddingConfigSavePayload, EmbeddingPreset } from '@/types';


import { createClient } from '@/lib/supabaseClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Retrieves a fresh access token from the Supabase session and returns
 * the Authorization headers for API requests.
 *
 * Falls back to the provided token if session refresh fails.
 */
async function getAuthHeaders(fallbackToken?: string): Promise<Record<string, string>> {
  if (fallbackToken) {
    return { Authorization: `Bearer ${fallbackToken}` };
  }
  try {
    const { data } = await createClient().auth.getSession();
    const token = data.session?.access_token;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch (err) {}
  throw new Error('Sesi login telah berakhir. Silakan login kembali.');
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
  onSession?: (sessionId: string) => void;
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
  callbacks: SSEStreamCallbacks,
  sessionId?: string
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
        session_id: sessionId || undefined,
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
    if (block.startsWith('event: session')) {
      const json = block.replace('event: session\ndata: ', '').trim();
      if (json && callbacks.onSession) {
        const data = JSON.parse(json);
        if (data.session_id) callbacks.onSession(data.session_id);
      }
    } else if (block.startsWith('event: citations')) {
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

// --- Chat Sessions API ---

export async function listChatSessions(token: string): Promise<ApiResponse<import('@/types').ChatSession[]>> {
  try {
    const headers = await getAuthHeaders(token);
    const response = await fetch(`${API_BASE}/api/chat/sessions`, { headers });
    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal mengambil riwayat sesi.') };
    }
    return { success: true, data: await response.json(), error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

export async function getSessionMessages(sessionId: string, token: string): Promise<ApiResponse<import('@/types').ChatMessage[]>> {
  try {
    const headers = await getAuthHeaders(token);
    const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}/messages`, { headers });
    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal mengambil pesan percakapan.') };
    }
    return { success: true, data: await response.json(), error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

export async function createChatSession(token: string, title?: string): Promise<ApiResponse<import('@/types').ChatSession>> {
  try {
    const headers = await getAuthHeaders(token);
    const response = await fetch(`${API_BASE}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal membuat sesi percakapan baru.') };
    }
    return { success: true, data: await response.json(), error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

export async function deleteChatSession(sessionId: string, token: string): Promise<ApiResponse<boolean>> {
  try {
    const headers = await getAuthHeaders(token);
    const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal menghapus sesi percakapan.') };
    }
    return { success: true, data: true, error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
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

export async function toggleDocumentActive(documentId: string, isActive: boolean, token: string): Promise<ApiResponse<DocumentItem>> {
  try {
    const headers = await getAuthHeaders(token);
    headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE}/api/documents/${documentId}/toggle`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ is_active: isActive }),
    });

    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal mengubah status dokumen.') };
    }

    return { success: true, data: await response.json(), error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

export async function getDocumentPreviewUrl(documentId: string, token: string): Promise<ApiResponse<DocumentPreviewResponse>> {
  try {
    const headers = await getAuthHeaders(token);

    const response = await fetch(`${API_BASE}/api/documents/${documentId}/preview`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal mengambil URL preview dokumen.') };
    }

    return { success: true, data: await response.json(), error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

// --- Provider Configs API ---

export async function listProviderConfigs(token: string): Promise<ApiResponse<ProviderConfig[]>> {
  try {
    const headers = await getAuthHeaders(token);
    const response = await fetch(`${API_BASE}/api/settings/providers`, { headers });

    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal mengambil daftar provider.') };
    }

    return { success: true, data: await response.json(), error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

export async function createProviderConfig(
  payload: import('@/types').ProviderConfigCreatePayload,
  token: string
): Promise<ApiResponse<ProviderConfig>> {
  try {
    const headers = await getAuthHeaders(token);
    const response = await fetch(`${API_BASE}/api/settings/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal menambahkan provider.') };
    }

    return { success: true, data: await response.json(), error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

export async function updateProviderConfig(
  id: string,
  payload: import('@/types').ProviderConfigUpdatePayload,
  token: string
): Promise<ApiResponse<ProviderConfig>> {
  try {
    const headers = await getAuthHeaders(token);
    const response = await fetch(`${API_BASE}/api/settings/providers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal memperbarui provider.') };
    }

    return { success: true, data: await response.json(), error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

export async function deleteProviderConfig(id: string, token: string): Promise<ApiResponse<boolean>> {
  try {
    const headers = await getAuthHeaders(token);
    const response = await fetch(`${API_BASE}/api/settings/providers/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal menghapus provider.') };
    }

    return { success: true, data: true, error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

// --- Embedding Config API ---

export async function listEmbeddingPresets(): Promise<ApiResponse<EmbeddingPreset[]>> {
  try {
    const response = await fetch(`${API_BASE}/api/settings/embedding/presets`);

    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal mengambil preset embedding.') };
    }

    return { success: true, data: await response.json(), error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

export async function getEmbeddingConfig(token: string): Promise<ApiResponse<EmbeddingConfig | null>> {
  try {
    const headers = await getAuthHeaders(token);
    const response = await fetch(`${API_BASE}/api/settings/embedding`, { headers });

    if (response.status === 404) {
      return { success: true, data: null, error: null };
    }

    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal mengambil konfigurasi embedding.') };
    }

    return { success: true, data: await response.json(), error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}

export async function saveEmbeddingConfig(
  payload: EmbeddingConfigSavePayload,
  token: string
): Promise<ApiResponse<EmbeddingConfig>> {
  try {
    const headers = await getAuthHeaders(token);
    const response = await fetch(`${API_BASE}/api/settings/embedding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, data: null, error: await extractErrorDetail(response, 'Gagal menyimpan konfigurasi embedding.') };
    }

    return { success: true, data: await response.json(), error: null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Terjadi kesalahan jaringan.' };
  }
}


