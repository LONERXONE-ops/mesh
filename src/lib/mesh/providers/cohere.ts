import { env } from "@/lib/env.server";
import { providerFetch } from "./http";
import { ProviderError } from "./types";
import type { ProviderAdapter, ProviderRequest, ProviderResult } from "./types";

interface CohereResponse {
  message?: {
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  };
}

export const cohereAdapter: ProviderAdapter = {
  id: "cohere",

  async generate(request: ProviderRequest): Promise<ProviderResult> {
    const key = env("COHERE_API_KEY");

    if (!key) {
      throw new ProviderError(
        "Cohere is not configured on the server.",
        "unavailable",
      );
    }

    const model = "command-a-plus-05-2026";

    const response = await providerFetch(
      "https://api.cohere.com/v2/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
        }),
        signal: request.signal,
      },
      "Cohere",
    );

    const data = (await response.json()) as CohereResponse;

    const content =
      data.message?.content
        ?.filter((part) => part.type === "text" || !part.type)
        .map((part) => part.text ?? "")
        .join("") ?? "";

    if (!content) {
      throw new ProviderError(
        "Cohere returned an empty response.",
        "failed",
      );
    }

    return {
      providerId: "cohere",
      model,
      content,
    };
  },
};
