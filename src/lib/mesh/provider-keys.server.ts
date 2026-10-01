import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function encryptionKey() {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET is required to encrypt provider API keys.",
    );
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptProviderKey(value: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptProviderKey(value: string) {
  const [version, ivText, tagText, encryptedText] = value.split(".");

  if (
    version !== "v1" ||
    !ivText ||
    !tagText ||
    !encryptedText
  ) {
    throw new Error("Invalid encrypted provider key.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(ivText, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(tagText, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
