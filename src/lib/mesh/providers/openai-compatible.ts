import { env } from "@/lib/env.server";
import { providerFetch } from "./http";
import { ProviderError } from "./types";
import type {
  ChatMessage,
  ProviderAdapter,
  ProviderRequest,
  ProviderResult,
} from "./types";

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

function createAdapter(
  id: string,
  name: string,
  serverKeyEnv: string,
  url: string,
  model: string,
  options?: {
    authHeader?: string;
    source?: "server" | "user";
  },
): ProviderAdapter {
  return {
    id,
    async generate(request: ProviderRequest): Promise<ProviderResult> {
      const source = options?.source ?? "user";
      const key = source === "server" ? env(serverKeyEnv) : request.apiKey?.trim();

      if (!key) {
        throw new ProviderError(
          `${name} is not connected.`,
          "not_connected",
        );
      }

      const messages: ChatMessage[] = request.messages;

      const response = await providerFetch(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [options?.authHeader ?? "Authorization"]: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 2048,
          }),
          signal: request.signal,
        },
        name,
      );

      const data = (await response.json()) as OpenAIResponse;
      let content = data.choices?.[0]?.message?.content ?? "";

      if (id === "dahl") {
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      }

      if (!content) {
        throw new ProviderError(
          `${name} returned an empty response.`,
          "failed",
        );
      }

      return {
        providerId: id,
        model,
        content,
      };
    },
  };
}

export const groqAdapter = createAdapter(
  "groq",
  "Groq",
  "GROQ_API_KEY",
  "https://api.groq.com/openai/v1/chat/completions",
  "openai/gpt-oss-120b",
  { source: "server" },
);

export const dahlAdapter = createAdapter(
  "dahl",
  "Dahl",
  "DAHL_API_KEY",
  "https://inference.dahl.global/v1/chat/completions",
  "MiniMaxAI/MiniMax-M2.7",
  { source: "server" },
);

export const openrouterAdapter = createAdapter(
  "openrouter",
  "OpenRouter",
  "OPENROUTER_API_KEY",
  "https://openrouter.ai/api/v1/chat/completions",
  "~openai/gpt-latest",
  { source: "server" },
);

export const deepseekAdapter = createAdapter(
  "deepseek",
  "DeepSeek",
  "",
  "https://api.deepseek.com/chat/completions",
  "deepseek-flash",
);

export const grokAdapter = createAdapter(
  "grok",
  "Grok",
  "",
  "https://api.x.ai/v1/chat/completions",
  "grok-4.7",
);

export const kimiAdapter = createAdapter(
  "kimi",
  "Kimi",
  "",
  "https://api.moonshot.ai/v1/chat/completions",
  "kimi-k3",
);
