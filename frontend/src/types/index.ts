/**
 * Application Type Definitions
 * Uses TypeScript Advanced Types (Discriminated Unions, Generic Wrappers, Strict Types).
 */

export interface UserPayload {
  readonly user_id: string;
  readonly email: string;
  readonly role: string;
}

/** Discriminated Union for UI Authentication State */
export type AuthState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly user: UserPayload }
  | { readonly status: 'error'; readonly message: string };

/** Generic API Result Wrapper */
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
  readonly created_at: string;
}

export interface ChatMessage {
  readonly id: string;
  readonly sender: 'user' | 'assistant';
  readonly content: string;
  readonly citations?: readonly Citation[];
  readonly created_at: string;
}
