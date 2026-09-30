const thumbs = new Map<string, string>();

export function rememberThumb(id: string, file: File) {
  if (!file.type.startsWith("image/")) return;
  const prev = thumbs.get(id);
  if (prev) URL.revokeObjectURL(prev);
  thumbs.set(id, URL.createObjectURL(file));
}

export function thumbUrl(id: string) {
  return thumbs.get(id);
}

export function forgetThumb(id: string) {
  const url = thumbs.get(id);
  if (url) URL.revokeObjectURL(url);
  thumbs.delete(id);
}
