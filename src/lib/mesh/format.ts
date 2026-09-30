export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function dayBucket(ts: number, now = Date.now()) {
  const a = new Date(ts);
  const b = new Date(now);
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  const diff = Math.round((startB - startA) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return "Earlier";
}

export function titleFrom(text: string, fallback: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  const base = clean || fallback;
  if (base.length <= 42) return base;
  const slice = base.slice(0, 42);
  const cut = slice.lastIndexOf(" ");
  return `${(cut > 18 ? slice.slice(0, cut) : slice).trim()}…`;
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function fileKind(name: string, mime: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    return "image" as const;
  }
  if (["csv", "xlsx", "xls"].includes(ext) || mime.includes("sheet") || mime.includes("csv")) {
    return "sheet" as const;
  }
  if (
    ["js", "ts", "tsx", "jsx", "py", "css", "html", "json", "md", "go", "rs"].includes(ext) ||
    mime.startsWith("text/")
  ) {
    return "code" as const;
  }
  return "doc" as const;
}
