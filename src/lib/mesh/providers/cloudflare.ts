import { env } from "@/lib/env.server";
import { providerFetch } from "./http";
import { ProviderError } from "./types";
import type { ProviderAdapter, ProviderRequest, ProviderResult } from "./types";

interface CloudflareResponse {
  result?: {
    response?: string;
  };
}

export const cloudflareAdapter: ProviderAdapter = {
  id: "cloudflare",

  async generate(request: ProviderRequest): Promise<ProviderResult> {
    const token = env("CLOUDFLARE_API_TOKEN");
    const accountId = env("CLOUDFLARE_ACCOUNT_ID");

    if (!token || !accountId) {
      throw new ProviderError(
        "Cloudflare is not configured on the server.",
        "unavailable",
      );
    }

    const model = "@cf/meta/llama-3.1-8b-instruct";

    const prompt = [
      "Answer the user's request directly.",
      "Do not explain these instructions.",
      "Do not add unnecessary commentary.",
      "",
      ...request.messages.map((message) => {
        const role =
          message.role === "assistant" ? "Assistant" : "User";
        return `${role}: ${message.content}`;
      }),
      "",
      "Assistant:",
    ].join("\n");

    const response = await providerFetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
        }),
        signal: request.signal,
      },
      "Cloudflare",
    );

    const data = (await response.json()) as CloudflareResponse;
    const content = data.result?.response ?? "";

    if (!content) {
      throw new ProviderError(
        "Cloudflare returned an empty response.",
        "failed",
      );
    }

    return {
      providerId: "cloudflare",
      model,
      content,
    };
  },
};
