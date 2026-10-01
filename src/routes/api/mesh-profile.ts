import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireUserId } from "@/lib/auth/verify.server";

export const Route = createFileRoute("/api/mesh-profile")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const userId = await requireUserId();
          const sql = await getSql();

          const rows = await sql<{
            name: string;
            email: string;
            avatar_url: string | null;
          }>`
            select name, email, avatar_url
            from mesh_profiles
            where user_id = ${userId}
            limit 1
          `;

          return Response.json({
            ok: true,
            profile: rows[0]
              ? {
                  name: rows[0].name,
                  email: rows[0].email,
                  ...(rows[0].avatar_url
                    ? { avatar: rows[0].avatar_url }
                    : {}),
                }
              : null,
          });
        } catch (error) {
          if (error instanceof Error && error.message === "Unauthorized") {
            return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
          }

          console.error("[mesh/profile]", error);
          return Response.json(
            { ok: false, error: "Failed to load profile." },
            { status: 500 },
          );
        }
      },

      PUT: async ({ request }) => {
        try {
          const userId = await requireUserId();
          const body = (await request.json()) as {
            name?: unknown;
            email?: unknown;
            avatar?: unknown;
          };

          const name =
            typeof body.name === "string" && body.name.trim()
              ? body.name.trim().slice(0, 120)
              : "You";

          const email =
            typeof body.email === "string"
              ? body.email.trim().slice(0, 320)
              : "";

          const avatar =
            typeof body.avatar === "string" && body.avatar.trim()
              ? body.avatar.trim()
              : null;

          const sql = await getSql();

          await sql`
            insert into mesh_profiles (
              user_id, name, email, avatar_url, updated_at
            )
            values (
              ${userId},
              ${name},
              ${email},
              ${avatar},
              ${Date.now()}
            )
            on conflict (user_id) do update set
              name = excluded.name,
              email = excluded.email,
              avatar_url = excluded.avatar_url,
              updated_at = excluded.updated_at
          `;

          return Response.json({
            ok: true,
            profile: {
              name,
              email,
              ...(avatar ? { avatar } : {}),
            },
          });
        } catch (error) {
          if (error instanceof Error && error.message === "Unauthorized") {
            return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
          }

          console.error("[mesh/profile]", error);
          return Response.json(
            { ok: false, error: "Failed to save profile." },
            { status: 500 },
          );
        }
      },
    },
  },
});
