import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireUserId } from "@/lib/auth/verify.server";
import {
  decryptProviderKey,
  encryptProviderKey,
} from "@/lib/mesh/provider-keys.server";
import { PROVIDERS } from "@/lib/mesh/catalog";

const BYOK_IDS = new Set(
  PROVIDERS.filter((provider) => provider.kind === "byok").map(
    (provider) => provider.id,
  ),
);

function validProvider(providerId: unknown): providerId is string {
  return typeof providerId === "string" && BYOK_IDS.has(providerId);
}

function cleanKey(value: unknown) {
  if (typeof value !== "string") return null;
  const key = value.trim();
  return key.length > 0 ? key : null;
}

export const Route = createFileRoute("/api/provider-keys")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const userId = await requireUserId();
          const sql = await getSql();

          const rows = await sql<{
            provider_id: string;
            encrypted_key: string;
          }>`
            select provider_id, encrypted_key
            from user_provider_keys
            where user_id = ${userId}
          `;

          return Response.json({
            ok: true,
            providers: rows.map((row) => {
              let connected = false;

              try {
                connected = Boolean(decryptProviderKey(row.encrypted_key));
              } catch {
                connected = false;
              }

              return {
                providerId: row.provider_id,
                connected,
              };
            }),
          });
        } catch (error) {
          if (error instanceof Error && error.message === "Unauthorized") {
            return Response.json(
              { ok: false, error: "Unauthorized" },
              { status: 401 },
            );
          }

          console.error("[mesh/provider-keys]", error);
          return Response.json(
            { ok: false, error: "Failed to load provider connections." },
            { status: 500 },
          );
        }
      },

      PUT: async ({ request }) => {
        try {
          const userId = await requireUserId();
          const body = (await request.json()) as {
            providerId?: unknown;
            key?: unknown;
          };

          if (!validProvider(body.providerId)) {
            return Response.json(
              { ok: false, error: "Invalid BYOK provider." },
              { status: 400 },
            );
          }

          const key = cleanKey(body.key);

          if (!key) {
            return Response.json(
              { ok: false, error: "API key is required." },
              { status: 400 },
            );
          }

          if (key.length > 4096) {
            return Response.json(
              { ok: false, error: "API key is too long." },
              { status: 400 },
            );
          }

          const sql = await getSql();
          const encryptedKey = encryptProviderKey(key);

          await sql`
            insert into user_provider_keys (
              user_id,
              provider_id,
              encrypted_key,
              created_at,
              updated_at
            )
            values (
              ${userId},
              ${body.providerId},
              ${encryptedKey},
              current_timestamp,
              current_timestamp
            )
            on conflict (user_id, provider_id)
            do update set
              encrypted_key = excluded.encrypted_key,
              updated_at = current_timestamp
          `;

          return Response.json({
            ok: true,
            providerId: body.providerId,
            connected: true,
          });
        } catch (error) {
          if (error instanceof Error && error.message === "Unauthorized") {
            return Response.json(
              { ok: false, error: "Unauthorized" },
              { status: 401 },
            );
          }

          console.error("[mesh/provider-keys]", error);
          return Response.json(
            { ok: false, error: "Failed to save provider key." },
            { status: 500 },
          );
        }
      },

      DELETE: async ({ request }) => {
        try {
          const userId = await requireUserId();
          const body = (await request.json()) as {
            providerId?: unknown;
          };

          if (!validProvider(body.providerId)) {
            return Response.json(
              { ok: false, error: "Invalid BYOK provider." },
              { status: 400 },
            );
          }

          const sql = await getSql();

          await sql`
            delete from user_provider_keys
            where user_id = ${userId}
              and provider_id = ${body.providerId}
          `;

          return Response.json({
            ok: true,
            providerId: body.providerId,
            connected: false,
          });
        } catch (error) {
          if (error instanceof Error && error.message === "Unauthorized") {
            return Response.json(
              { ok: false, error: "Unauthorized" },
              { status: 401 },
            );
          }

          console.error("[mesh/provider-keys]", error);
          return Response.json(
            { ok: false, error: "Failed to remove provider key." },
            { status: 500 },
          );
        }
      },
    },
  },
});
