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
  apiKeyEnv: string,
  url: string,
  model: string,
): ProviderAdapter {
  return {
    id,
    async generate(request: ProviderRequest): Promise<ProviderResult> {
      const key = env(apiKeyEnv);

      if (!key) {
        throw new ProviderError(
          `${name} is not configured on the server.`,
          "unavailable",
        );
      }

      const messages: ChatMessage[] = request.messages;

      const response = await providerFetch(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: id === "openrouter" ? 1000 : 2048,
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
);

export const mistralAdapter = createAdapter(
  "mistral",
  "Mistral",
  "MISTRAL_API_KEY",
  "https://api.mistral.ai/v1/chat/completions",
  "mistral-large-latest",
);

export const dahlAdapter = createAdapter(
  "dahl",
  "Dahl",
  "DAHL_API_KEY",
  "https://inference.dahl.global/v1/chat/completions",
  "MiniMaxAI/MiniMax-M2.7",
);

export const openrouterAdapter = createAdapter(
  "openrouter",
  "OpenRouter",
  "OPENROUTER_API_KEY",
  "https://openrouter.ai/api/v1/chat/completions",
  "~openai/gpt-latest",
);
