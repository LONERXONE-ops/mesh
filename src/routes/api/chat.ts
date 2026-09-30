import { createFileRoute } from "@tanstack/react-router";
import { generateWithProvider } from "@/lib/mesh/providers";
import { ProviderError, type ChatMessage } from "@/lib/mesh/providers/types";

interface ChatBody {
  providerId: string;
  messages: ChatMessage[];
}

function isValidBody(value: unknown): value is ChatBody {
  if (!value || typeof value !== "object") return false;

  const body = value as Record<string, unknown>;

  if (typeof body.providerId !== "string" || !body.providerId) {
    return false;
  }

  if (!Array.isArray(body.messages)) return false;

  return body.messages.every(
    (message) =>
      message &&
      typeof message === "object" &&
      ((message as Record<string, unknown>).role === "user" ||
        (message as Record<string, unknown>).role === "assistant") &&
      typeof (message as Record<string, unknown>).content === "string",
  );
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.json();

          if (!isValidBody(raw)) {
            return Response.json(
              { error: "Invalid chat request." },
              { status: 400 },
            );
          }

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 90_000);

          try {
            const result = await generateWithProvider({
              providerId: raw.providerId,
              messages: raw.messages,
              signal: controller.signal,
            });

            return Response.json({
              ok: true,
              providerId: result.providerId,
              model: result.model,
              content: result.content,
            });
          } finally {
            clearTimeout(timeout);
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return Response.json(
              {
                ok: false,
                errorKind: "unavailable",
                error: "The model request timed out.",
              },
              { status: 504 },
            );
          }

          if (error instanceof ProviderError) {
            const status =
              error.kind === "not_connected"
                ? 401
                : error.kind === "unavailable"
                  ? 503
                  : 502;

            return Response.json(
              {
                ok: false,
                errorKind: error.kind,
                error: error.message,
              },
              { status },
            );
          }

          console.error("[mesh/chat]", error);

          return Response.json(
            {
              ok: false,
              errorKind: "failed",
              error: "Model request failed.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
