export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ProviderRequest {
  providerId: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
  apiKey?: string;
}

export interface ProviderResult {
  providerId: string;
  model: string;
  content: string;
}

export type ProviderErrorKind =
  | "unavailable"
  | "not_connected"
  | "failed";

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly status?: number;

  constructor(message: string, kind: ProviderErrorKind, status?: number) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
    this.status = status;
  }
}

export interface ProviderAdapter {
  id: string;
  generate(request: ProviderRequest): Promise<ProviderResult>;
}
