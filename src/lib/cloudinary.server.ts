import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env.server";

const cloudName = env("CLOUDINARY_CLOUD_NAME");
const apiKey = env("CLOUDINARY_API_KEY");
const apiSecret = env("CLOUDINARY_API_SECRET");

export const cloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function destroyCloudinaryAssets(publicIds: Array<string | null | undefined>) {
  const ids = [...new Set(publicIds.map((id) => id?.trim()).filter((id): id is string => Boolean(id)))];
  if (!ids.length || !cloudinaryConfigured) return;
  await Promise.all(
    ids.map(async (publicId) => {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
        await cloudinary.uploader.destroy(publicId, { resource_type: "raw", invalidate: true });
        await cloudinary.uploader.destroy(publicId, { resource_type: "video", invalidate: true });
      } catch (error) {
        console.error("[mesh/cloudinary] destroy failed", publicId);
      }
    }),
  );
}
