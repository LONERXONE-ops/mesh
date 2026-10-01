import { providerFetch } from "./http";
import { ProviderError } from "./types";
import type {
  ChatMessage,
  ProviderAdapter,
  ProviderRequest,
  ProviderResult,
} from "./types";

interface AnthropicResponse {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
}

export const claudeAdapter: ProviderAdapter = {
  id: "claude",

  async generate(request: ProviderRequest): Promise<ProviderResult> {
    const key = request.apiKey?.trim();

    if (!key) {
      throw new ProviderError(
        "Claude is not connected.",
        "not_connected",
      );
    }

    const messages: ChatMessage[] = request.messages;

    const response = await providerFetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          messages,
        }),
        signal: request.signal,
      },
      "Claude",
    );

    const data = (await response.json()) as AnthropicResponse;

    const content =
      data.content
        ?.filter((part) => part.type === "text")
        .map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

    if (!content) {
      throw new ProviderError(
        "Claude returned an empty response.",
        "failed",
      );
    }

    return {
      providerId: "claude",
      model: "claude-sonnet-4-6",
      content,
    };
  },
};
