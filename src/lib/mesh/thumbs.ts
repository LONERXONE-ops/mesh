const thumbs = new Map<string, string>();
const attachments = new Map<string, { name: string; mime: string; text: string }>();
const INLINE_LIMIT = 1_500_000;
const TEXT_NAME = /\.(txt|md|markdown|json|csv|tsv|ts|tsx|js|jsx|mjs|cjs|py|html|css|svg|xml|yml|yaml|log|ini|env|sh)$/i;

export function rememberThumb(id: string, file: File) {
  if (!file.type.startsWith("image/")) return;
  const prev = thumbs.get(id);
  if (prev) URL.revokeObjectURL(prev);
  thumbs.set(id, URL.createObjectURL(file));
}

export function thumbUrl(id: string) {
  return thumbs.get(id);
}

export function attachmentText(id: string) {
  return attachments.get(id);
}

export async function rememberAttachment(id: string, file: File) {
  const mime = file.type || "application/octet-stream";
  const textLike = mime.startsWith("text/") || mime === "application/json" || mime === "application/xml" || TEXT_NAME.test(file.name);
  if (textLike) {
    const text = await file.text();
    attachments.set(id, { name: file.name, mime, text: cap(text, file.name) });
    return;
  }
  const dataUrl = await readDataUrl(file);
  attachments.set(id, { name: file.name, mime, text: cap(dataUrl, file.name) });
}

export function forgetThumb(id: string) {
  const url = thumbs.get(id);
  if (url) URL.revokeObjectURL(url);
  thumbs.delete(id);
  attachments.delete(id);
}

function cap(text: string, name: string) {
  if (text.length <= INLINE_LIMIT) return text;
  return `${text.slice(0, INLINE_LIMIT)}\n\n[Attachment ${name} truncated at ${INLINE_LIMIT} characters.]`;
}

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read attachment."));
    reader.readAsDataURL(file);
  });
}
