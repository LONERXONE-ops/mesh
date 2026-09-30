import { env } from "@/lib/env.server";
import { providerFetch } from "./http";
import type { ProviderAdapter, ProviderRequest, ProviderResult } from "./types";

const MODEL = "gemini-3.8-flash";

function toGeminiContents(messages: ProviderRequest["messages"]) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

export const geminiAdapter: ProviderAdapter = {
  id: "gemini",

  async generate(request): Promise<ProviderResult> {
    const key = env("GEMINI_API_KEY");

    if (!key) {
      const { ProviderError } = await import("./types");
      throw new ProviderError(
        "Gemini is not configured on the server.",
        "unavailable",
      );
    }

    const response = await providerFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: toGeminiContents(request.messages),
        }),
        signal: request.signal,
      },
      "Gemini",
    );

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const content =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("") ?? "";

    if (!content) {
      const { ProviderError } = await import("./types");
      throw new ProviderError(
        "Gemini returned an empty response.",
        "failed",
      );
    }

    return {
      providerId: "gemini",
      model: MODEL,
      content,
    };
  },
};
