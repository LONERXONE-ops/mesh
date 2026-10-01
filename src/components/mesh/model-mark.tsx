import { cn } from "@/lib/cn";

const TONE: Record<string, string> = {
  gemini: "bg-model-gemini/15 text-model-gemini",
  groq: "bg-fg/10 text-model-groq",
  dahl: "bg-model-dahl/15 text-model-dahl",
  cloudflare: "bg-model-cloudflare/15 text-model-cloudflare",
  openrouter: "bg-fg/10 text-model-openrouter",
  cohere: "bg-fg/10 text-model-cohere",
  claude: "bg-model-claude/15 text-model-claude",
  deepseek: "bg-model-deepseek/15 text-model-deepseek",
  grok: "bg-fg/10 text-model-grok",
  kimi: "bg-model-kimi/15 text-model-kimi",
};

function Glyph({ id }: { id: string }) {
  if (id === "gemini") {
    return (
      <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
        <path fill="currentColor" d="M12 2.2 13.6 10.4 21.8 12 13.6 13.6 12 21.8 10.4 13.6 2.2 12 10.4 10.4 12 2.2Z" />
      </svg>
    );
  }
  if (id === "groq") {
    return <span className="text-[13px] font-semibold leading-none">9</span>;
  }
  if (id === "dahl" || id === "claude") {
    return (
      <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M11 2h2v4.2l3-3 1.4 1.4-3 3H20v2h-5.6l3 3-1.4 1.4-3-3V20h-2v-5.6l-3 3-1.4-1.4 3-3H4v-2h5.6l-3-3L8 3.2l3 3V2Z"
        />
      </svg>
    );
  }
  if (id === "cloudflare") {
    return (
      <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M7 16h11.2a3.2 3.2 0 0 0 .4-6.4 5 5 0 0 0-9.6-1.2A3.6 3.6 0 0 0 7 16Z"
        />
      </svg>
    );
  }
  if (id === "openrouter") {
    return (
      <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          d="M10 13a5 5 0 0 0 7.1.1l1.4-1.4a5 5 0 0 0-7.1-7.1L10 6M14 11a5 5 0 0 0-7.1-.1L5.5 12.3a5 5 0 0 0 7.1 7.1L14 18"
        />
      </svg>
    );
  }
  if (id === "deepseek") {
    return (
      <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M4 13c2-4 4-6 8-6 3 0 5 2 6 4-2 1-3 2-3 4 0 2 2 3 4 3-2 3-5 4-8 4-5 0-8-4-7-9Z"
        />
      </svg>
    );
  }
  if (id === "grok") {
    return <span className="text-[12px] font-semibold leading-none">X</span>;
  }
  const letter = id === "cohere" ? "C" : id === "kimi" ? "K" : id.slice(0, 1).toUpperCase();
  return <span className="text-[12px] font-semibold leading-none">{letter}</span>;
}

export function ModelMark({ id, className }: { id: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full border border-line",
        TONE[id] ?? "bg-surface-2 text-fg",
        className,
      )}
    >
      <Glyph id={id} />
    </span>
  );
}
