import { cloudflareAdapter } from "./cloudflare";
import { cohereAdapter } from "./cohere";
import {
  dahlAdapter,
  deepseekAdapter,
  grokAdapter,
  groqAdapter,
  kimiAdapter,
  openrouterAdapter,
} from "./openai-compatible";
import { geminiAdapter } from "./gemini";
import { claudeAdapter } from "./claude";
import { ProviderError } from "./types";
import type { ProviderAdapter, ProviderRequest, ProviderResult } from "./types";

const adapters = new Map<string, ProviderAdapter>([
  ["gemini", geminiAdapter],
  ["groq", groqAdapter],
  ["dahl", dahlAdapter],
  ["cloudflare", cloudflareAdapter],
  ["openrouter", openrouterAdapter],
  ["cohere", cohereAdapter],
  ["deepseek", deepseekAdapter],
  ["grok", grokAdapter],
  ["kimi", kimiAdapter],
  ["claude", claudeAdapter],
]);

export async function generateWithProvider(
  request: ProviderRequest,
): Promise<ProviderResult> {
  const adapter = adapters.get(request.providerId);

  if (!adapter) {
    throw new ProviderError(
      `${request.providerId} is not available yet.`,
      "unavailable",
    );
  }

  return adapter.generate(request);
}
