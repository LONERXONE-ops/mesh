export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ProviderRequest {
  providerId: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}

export interface ProviderResult {
  providerId: string;
  model: string;
  content: string;
}

export class ProviderError extends Error {
  readonly kind: "unavailable" | "not_connected" | "failed";
  readonly status?: number;

  constructor(
    message: string,
    kind: "unavailable" | "not_connected" | "failed" = "failed",
    status?: number,
  ) {
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
