

export interface UserPayload {
  readonly user_id: string;
  readonly email: string;
  readonly role: string;
}


export type AuthState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly user: UserPayload }
  | { readonly status: 'error'; readonly message: string };


export type ApiResponse<T> =
  | { readonly success: true; readonly data: T; readonly error: null }
  | { readonly success: false; readonly data: null; readonly error: string };

export interface Citation {
  readonly filename: string;
  readonly page_number: number;
  readonly content: string;
}

export interface DocumentItem {
  readonly id: string;
  readonly filename: string;
  readonly file_size: number;
  readonly total_pages?: number;
  readonly file_path?: string | null;
  readonly is_active?: boolean;
  readonly status?: 'processing' | 'ready' | 'failed';
  readonly created_at: string;
}

export interface DocumentPreviewResponse {
  readonly document_id: string;
  readonly signed_url: string;
  readonly expires_in: number;
}

export interface ChatSession {
  readonly id: string;
  readonly user_id: string;
  readonly title: string;
  readonly created_at: string;
}

export interface ChatMessage {
  readonly id: string;
  readonly sender: 'user' | 'assistant';
  readonly content: string;
  readonly citations?: readonly Citation[];
  readonly created_at: string;
}

export type ProviderType = 'gemini' | 'openai' | 'openrouter' | 'openai_compatible';

export interface ProviderConfig {
  readonly id: string;
  readonly user_id: string;
  readonly provider: ProviderType;
  readonly display_name: string | null;
  readonly api_key_masked: string;
  readonly base_url: string | null;
  readonly model_name: string | null;
  readonly is_default: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ProviderConfigCreatePayload {
  readonly provider: ProviderType;
  readonly api_key: string;
  readonly display_name?: string;
  readonly base_url?: string;
  readonly model_name?: string;
  readonly is_default?: boolean;
}

export interface ProviderConfigUpdatePayload {
  readonly display_name?: string;
  readonly api_key?: string;
  readonly base_url?: string;
  readonly model_name?: string;
  readonly is_default?: boolean;
}

export interface EmbeddingPreset {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly model_name: string;
  readonly embedding_dimensions: number;
  readonly description: string;
}

export interface EmbeddingConfig {
  readonly user_id: string;
  readonly provider: string;
  readonly api_key_masked: string;
  readonly base_url: string | null;
  readonly model_name: string;
  readonly embedding_dimensions: number;
  readonly locked: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface EmbeddingConfigSavePayload {
  readonly provider: string;
  readonly api_key?: string;
  readonly base_url?: string;
  readonly model_name: string;
  readonly embedding_dimensions: number;
}


