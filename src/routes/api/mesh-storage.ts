import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireUserId } from "@/lib/auth/verify.server";
import { destroyCloudinaryAssets } from "@/lib/cloudinary.server";

type ModelResponse = {
  id: string;
  modelId: string;
  status: string;
  content: string;
  errorKind?: string;
  error?: string;
};

type Attachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  status: string;
  url?: string;
  cloudinaryPublicId?: string;
  error?: string;
};

type Turn = {
  id: string;
  content: string;
  attachments: Attachment[];
  createdAt: number;
  timeLabel: string;
  responses: ModelResponse[];
};

type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: string;
  modelIds: string[];
  saved: boolean;
  turns: Turn[];
};

function unauthorized(error: unknown) {
  return error instanceof Error && error.message === "Unauthorized";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export const Route = createFileRoute("/api/mesh-storage")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const userId = await requireUserId();
          const sql = await getSql();

          const conversations = await sql<{
            id: string;
            title: string;
            created_at: number;
            updated_at: number;
            mode: string;
            model_ids: unknown;
            saved: boolean;
          }>`
            select id, title, created_at, updated_at, mode, model_ids, saved
            from mesh_conversations
            where user_id = ${userId}
            order by updated_at desc
          `;

          const result: Conversation[] = [];

          for (const conversation of conversations) {
            const turns = await sql<{
              id: string;
              content: string;
              created_at: number;
              time_label: string;
            }>`
              select id, content, created_at, time_label
              from mesh_turns
              where conversation_id = ${conversation.id}
              order by created_at asc
            `;

            const turnResult: Turn[] = [];

            for (const turn of turns) {
              const responses = await sql<{
                id: string;
                model_id: string;
                status: string;
                content: string;
                error_kind: string | null;
                error: string | null;
              }>`
                select id, model_id, status, content, error_kind, error
                from mesh_responses
                where turn_id = ${turn.id}
                order by id asc
              `;

              const attachments = await sql<{
                id: string;
                name: string;
                mime: string;
                size: number;
                status: string;
                url: string | null;
                cloudinary_public_id: string | null;
                error: string | null;
              }>`
                select id, name, mime, size, status, url, cloudinary_public_id, error
                from mesh_attachments
                where turn_id = ${turn.id}
                order by id asc
              `;

              turnResult.push({
                id: turn.id,
                content: turn.content,
                createdAt: numberValue(turn.created_at),
                timeLabel: turn.time_label,
                attachments: attachments.map((file) => ({
                  id: file.id,
                  name: file.name,
                  mime: file.mime,
                  size: numberValue(file.size),
                  status: file.status,
                  ...(file.url ? { url: file.url } : {}),
                  ...(file.cloudinary_public_id
                    ? { cloudinaryPublicId: file.cloudinary_public_id }
                    : {}),
                  ...(file.error ? { error: file.error } : {}),
                })),
                responses: responses.map((response) => ({
                  id: response.id,
                  modelId: response.model_id,
                  status: response.status,
                  content: response.content,
                  ...(response.error_kind
                    ? { errorKind: response.error_kind }
                    : {}),
                  ...(response.error ? { error: response.error } : {}),
                })),
              });
            }

            const modelIds = Array.isArray(conversation.model_ids)
              ? conversation.model_ids.filter((id): id is string => typeof id === "string")
              : [];

            result.push({
              id: conversation.id,
              title: conversation.title,
              createdAt: numberValue(conversation.created_at),
              updatedAt: numberValue(conversation.updated_at),
              mode: conversation.mode,
              modelIds,
              saved: Boolean(conversation.saved),
              turns: turnResult,
            });
          }

          return Response.json({ ok: true, conversations: result });
        } catch (error) {
          if (unauthorized(error)) {
            return Response.json(
              { ok: false, error: "Unauthorized" },
              { status: 401 },
            );
          }

          console.error("[mesh/storage]", error);
          return Response.json(
            { ok: false, error: "Failed to load Mesh storage." },
            { status: 500 },
          );
        }
      },

      PUT: async ({ request }) => {
        try {
          const userId = await requireUserId();
          const body = (await request.json()) as {
            conversation?: Conversation;
          };

          const conversation = body.conversation;

          if (
            !conversation ||
            typeof conversation.id !== "string" ||
            !Array.isArray(conversation.turns)
          ) {
            return Response.json(
              { ok: false, error: "Invalid conversation." },
              { status: 400 },
            );
          }

          const sql = await getSql();

          await sql`
            insert into mesh_conversations (
              id, user_id, title, created_at, updated_at, mode, model_ids, saved
            )
            values (
              ${conversation.id},
              ${userId},
              ${conversation.title},
              ${conversation.createdAt},
              ${conversation.updatedAt},
              ${conversation.mode},
              ${JSON.stringify(conversation.modelIds)}::jsonb,
              ${Boolean(conversation.saved)}
            )
            on conflict (id) do update set
              title = excluded.title,
              updated_at = excluded.updated_at,
              mode = excluded.mode,
              model_ids = excluded.model_ids,
              saved = excluded.saved
            where mesh_conversations.user_id = ${userId}
          `;

          for (const turn of conversation.turns) {
            await sql`
              insert into mesh_turns (
                id, conversation_id, content, created_at, time_label
              )
              values (
                ${turn.id},
                ${conversation.id},
                ${turn.content},
                ${turn.createdAt},
                ${turn.timeLabel}
              )
              on conflict (id) do update set
                content = excluded.content,
                created_at = excluded.created_at,
                time_label = excluded.time_label
                where exists (
                  select 1
                  from mesh_conversations
                  where mesh_conversations.id = ${conversation.id}
                    and mesh_conversations.user_id = ${userId}
                )
            `;

            for (const response of turn.responses) {
              await sql`
                insert into mesh_responses (
                  id, turn_id, model_id, status, content, error_kind, error
                )
                values (
                  ${response.id},
                  ${turn.id},
                  ${response.modelId},
                  ${response.status},
                  ${response.content},
                  ${response.errorKind ?? null},
                  ${response.error ?? null}
                )
                on conflict (id) do update set
                  model_id = excluded.model_id,
                  status = excluded.status,
                  content = excluded.content,
                  error_kind = excluded.error_kind,
                  error = excluded.error
                  where exists (
                    select 1
                    from mesh_turns
                    join mesh_conversations
                      on mesh_conversations.id = mesh_turns.conversation_id
                    where mesh_turns.id = ${turn.id}
                      and mesh_conversations.user_id = ${userId}
                  )
              `;
            }

            for (const attachment of turn.attachments) {
              await sql`
                insert into mesh_attachments (
                  id, turn_id, name, mime, size, status, url,
                  cloudinary_public_id, error
                )
                values (
                  ${attachment.id},
                  ${turn.id},
                  ${attachment.name},
                  ${attachment.mime},
                  ${attachment.size},
                  ${attachment.status},
                  ${attachment.url ?? null},
                  ${attachment.cloudinaryPublicId ?? null},
                  ${attachment.error ?? null}
                )
                on conflict (id) do update set
                  name = excluded.name,
                  mime = excluded.mime,
                  size = excluded.size,
                  status = excluded.status,
                  url = excluded.url,
                  cloudinary_public_id = excluded.cloudinary_public_id,
                  error = excluded.error
                  where exists (
                    select 1
                    from mesh_turns
                    join mesh_conversations
                      on mesh_conversations.id = mesh_turns.conversation_id
                    where mesh_turns.id = ${turn.id}
                      and mesh_conversations.user_id = ${userId}
                  )
              `;
            }
          }

          return Response.json({ ok: true });
        } catch (error) {
          if (unauthorized(error)) {
            return Response.json(
              { ok: false, error: "Unauthorized" },
              { status: 401 },
            );
          }

          console.error("[mesh/storage]", error);
          return Response.json(
            { ok: false, error: "Failed to save conversation." },
            { status: 500 },
          );
        }
      },

      DELETE: async ({ request }) => {
        try {
          const userId = await requireUserId();
          const body = (await request.json()) as { id?: unknown };

          if (typeof body.id !== "string" || !body.id) {
            return Response.json(
              { ok: false, error: "Conversation id is required." },
              { status: 400 },
            );
          }

          const sql = await getSql();
          const assets = await sql<{ cloudinary_public_id: string | null }>`
            select mesh_attachments.cloudinary_public_id
            from mesh_attachments
            join mesh_turns on mesh_turns.id = mesh_attachments.turn_id
            join mesh_conversations on mesh_conversations.id = mesh_turns.conversation_id
            where mesh_conversations.id = ${body.id}
              and mesh_conversations.user_id = ${userId}
          `;
          await destroyCloudinaryAssets(assets.map((row) => row.cloudinary_public_id));

          await sql`
            delete from mesh_conversations
            where id = ${body.id}
              and user_id = ${userId}
          `;

          return Response.json({ ok: true });
        } catch (error) {
          if (unauthorized(error)) {
            return Response.json(
              { ok: false, error: "Unauthorized" },
              { status: 401 },
            );
          }

          console.error("[mesh/storage]", error);
          return Response.json(
            { ok: false, error: "Failed to delete conversation." },
            { status: 500 },
          );
        }
      },
    },
  },
});
