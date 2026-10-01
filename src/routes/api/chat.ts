import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireUserId } from "@/lib/auth/verify.server";
import { decryptProviderKey } from "@/lib/mesh/provider-keys.server";
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

  if (!Array.isArray(body.messages)) {
    return false;
  }

  return body.messages.every(
    (message) =>
      message &&
      typeof message === "object" &&
      ((message as Record<string, unknown>).role === "user" ||
        (message as Record<string, unknown>).role === "assistant") &&
      typeof (message as Record<string, unknown>).content === "string",
  );
}

async function getUserProviderKey(
  userId: string,
  providerId: string,
): Promise<string | undefined> {
  const sql = await getSql();

  const rows = await sql<{
    encrypted_key: string;
  }>`
    select encrypted_key
    from user_provider_keys
    where user_id = ${userId}
      and provider_id = ${providerId}
    limit 1
  `;

  const encrypted = rows[0]?.encrypted_key;

  if (!encrypted) return undefined;

  try {
    return decryptProviderKey(encrypted);
  } catch (error) {
    console.error("[mesh/provider-keys] decrypt failed", error);
    throw new ProviderError(
      "The saved provider key could not be decrypted.",
      "failed",
    );
  }
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

          const userId = await requireUserId();

          const apiKey = await getUserProviderKey(
            userId,
            raw.providerId,
          );

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 90_000);

          try {
            const result = await generateWithProvider({
              providerId: raw.providerId,
              messages: raw.messages,
              signal: controller.signal,
              apiKey,
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

          if (error instanceof Error && error.message === "Unauthorized") {
            return Response.json(
              {
                ok: false,
                errorKind: "not_connected",
                error: "Unauthorized",
              },
              { status: 401 },
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
