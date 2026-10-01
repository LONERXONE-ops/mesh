import { createFileRoute } from "@tanstack/react-router";
import { requireUserId } from "@/lib/auth/verify.server";
import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export const Route = createFileRoute("/api/mesh-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await requireUserId();

          if (!cloudName || !apiKey || !apiSecret) {
            return Response.json(
              { ok: false, error: "Cloudinary is not configured." },
              { status: 503 },
            );
          }

          const form = await request.formData();
          const file = form.get("file");
          const kind = form.get("kind");

          if (!(file instanceof File)) {
            return Response.json(
              { ok: false, error: "File is required." },
              { status: 400 },
            );
          }

          if (file.size > 20 * 1024 * 1024) {
            return Response.json(
              { ok: false, error: "File is too large. Maximum is 20MB." },
              { status: 400 },
            );
          }

          const bytes = Buffer.from(await file.arrayBuffer());
          const dataUri = `data:${file.type || "application/octet-stream"};base64,${bytes.toString("base64")}`;

          const folder =
            kind === "avatar"
              ? `mesh/${userId}/avatars`
              : `mesh/${userId}/attachments`;

          const result = await cloudinary.uploader.upload(dataUri, {
            folder,
            resource_type: "auto",
            use_filename: true,
            unique_filename: true,
          });

          return Response.json({
            ok: true,
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            bytes: result.bytes,
          });
        } catch (error) {
          if (error instanceof Error && error.message === "Unauthorized") {
            return Response.json(
              { ok: false, error: "Unauthorized" },
              { status: 401 },
            );
          }

          console.error("[mesh/upload]", error);
          return Response.json(
            { ok: false, error: "Upload failed." },
            { status: 500 },
          );
        }
      },
    },
  },
});
