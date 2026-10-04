import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireUserId } from "@/lib/auth/verify.server";
import { destroyCloudinaryAssets } from "@/lib/cloudinary.server";

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
            avatarPublicId?: unknown;
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
          const avatarPublicId =
            typeof body.avatarPublicId === "string" && body.avatarPublicId.trim()
              ? body.avatarPublicId.trim()
              : null;

          const sql = await getSql();
          const previous = await sql<{ avatar_public_id: string | null }>`
            select avatar_public_id from mesh_profiles where user_id = ${userId} limit 1
          `;
          const previousId = previous[0]?.avatar_public_id;
          if (previousId && previousId !== avatarPublicId) {
            await destroyCloudinaryAssets([previousId]);
          }

          await sql`
            insert into mesh_profiles (
              user_id, name, email, avatar_url, avatar_public_id, updated_at
            )
            values (
              ${userId},
              ${name},
              ${email},
              ${avatar},
              ${avatarPublicId},
              ${Date.now()}
            )
            on conflict (user_id) do update set
              name = excluded.name,
              email = excluded.email,
              avatar_url = excluded.avatar_url,
              avatar_public_id = coalesce(excluded.avatar_public_id, mesh_profiles.avatar_public_id),
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
