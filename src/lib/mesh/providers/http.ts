import { ProviderError } from "./types";

export async function providerFetch(
  url: string,
  init: RequestInit,
  providerName: string,
): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: init.signal,
    });

    if (response.ok) return response;

    let detail = "";
    try {
      const body = await response.json();
      detail =
        body?.error?.message ??
        body?.message ??
        body?.error ??
        "";
    } catch {
      // Ignore non-JSON error bodies.
    }

    if (response.status === 401 || response.status === 403) {
      throw new ProviderError(
        `${providerName} API authentication failed.`,
        "not_connected",
        response.status,
      );
    }

    if (response.status === 429 || response.status >= 500) {
      throw new ProviderError(
        `${providerName} is temporarily unavailable.${detail ? ` ${detail}` : ""}`,
        "unavailable",
        response.status,
      );
    }

    throw new ProviderError(
      `${providerName} request failed (${response.status}).${detail ? ` ${detail}` : ""}`,
      "failed",
      response.status,
    );
  } catch (error) {
    if (error instanceof ProviderError) throw error;

    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new ProviderError(
      `${providerName} request failed.`,
      "failed",
    );
  }
}
