import { Check, Copy, MoreHorizontal, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { providerById } from "@/lib/mesh/catalog";
import { runResponse } from "@/lib/mesh/engine";
import { fileKind, formatBytes } from "@/lib/mesh/format";
import { meshActions, useMesh } from "@/lib/mesh/store";
import { thumbUrl } from "@/lib/mesh/thumbs";
import type { Attachment, Conversation, ModelResponse, Turn } from "@/lib/mesh/types";
import { cn } from "@/lib/cn";
import { Avatar, focusRing } from "./bits";
import { FileCode, FileSpreadsheet, FileText, ImageIcon } from "lucide-react";
import { ModelMark } from "./model-mark";
import { RichText } from "./rich-text";

function statusLabel(response: ModelResponse) {
  if (response.status === "waiting") return "Waiting…";
  if (response.status === "thinking") return "Thinking…";
  if (response.status === "streaming") return "Streaming…";
  if (response.status === "completed") return "Completed";
  if (response.errorKind === "unavailable") return "Unavailable";
  return "Couldn't respond";
}

function FileRow({ file }: { file: Attachment }) {
  const preview = thumbUrl(file.id);
  const kind = fileKind(file.name, file.mime);
  const Icon = kind === "image" ? ImageIcon : kind === "sheet" ? FileSpreadsheet : kind === "code" ? FileCode : FileText;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-chip px-2 py-1.5">
      {preview ? (
        <img src={preview} alt="" className="size-10 rounded-lg object-cover" />
      ) : (
        <span className="grid size-10 place-items-center rounded-lg bg-surface">
          <Icon className="size-4 text-muted" aria-hidden />
        </span>
      )}
      <span className="min-w-0">
        <span className="block max-w-48 truncate text-sm">{file.name}</span>
        <span className="block text-xs text-faint">{formatBytes(file.size)}</span>
      </span>
    </div>
  );
}

function ThinkingCard() {
  return (
    <div className="mt-2 rounded-xl border border-line bg-chip px-4 py-4" aria-hidden>
      <span className="flex gap-1">
        <span className="mesh-dot size-1.5 rounded-full bg-muted" />
        <span className="mesh-dot size-1.5 rounded-full bg-muted" />
        <span className="mesh-dot size-1.5 rounded-full bg-muted" />
      </span>
    </div>
  );
}

function ResponseCard({
  conv,
  turn,
  response,
  collapsed,
  onToggle,
  showTimestamps,
}: {
  conv: Conversation;
  turn: Turn;
  response: ModelResponse;
  collapsed: boolean;
  onToggle: () => void;
  showTimestamps: boolean;
}) {
  const name = providerById(response.modelId)?.name ?? response.modelId;
  const showBody = response.status === "thinking" || response.status === "error" || response.content;
  const preview = response.content.replace(/\s+/g, " ").trim();

  async function copy() {
    try {
      await navigator.clipboard.writeText(response.content);
      toast("Copied");
    } catch {
      toast("Couldn't copy");
    }
  }

  return (
    <article className="mt-2 rounded-2xl border border-line bg-surface px-3 py-3 sm:px-4" aria-label={`${name} response`}>
      <header className="flex items-center gap-2">
        <ModelMark id={response.modelId} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-medium">{name}</h3>
            <p className="flex items-center gap-1 text-xs text-muted" aria-live="polite">
              {response.status === "completed" ? <Check className="size-3.5 text-ok" aria-hidden /> : null}
              {response.status === "error" ? (
                <span className="size-1.5 rounded-full bg-danger" aria-hidden />
              ) : null}
              {response.status === "thinking" || response.status === "streaming" || response.status === "waiting" ? (
                <span className="size-1.5 rounded-full bg-muted motion-safe:animate-pulse" aria-hidden />
              ) : null}
              {statusLabel(response)}
            </p>
          </div>
        </div>
        {showTimestamps ? (
          <time className="text-xs text-faint" dateTime={new Date(turn.createdAt).toISOString()}>
            {turn.timeLabel}
          </time>
        ) : null}
      </header>

      {collapsed && preview ? (
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "mt-2 w-full rounded-xl border border-line bg-chip px-4 py-3 text-left text-sm text-muted",
            focusRing,
          )}
        >
          <span className="line-clamp-1">{preview}</span>
        </button>
      ) : null}

      {!collapsed && response.status === "thinking" ? <ThinkingCard /> : null}
      {!collapsed && response.status === "waiting" ? (
        <p className="mt-2 text-sm text-faint">Waiting for the previous model.</p>
      ) : null}
      {!collapsed && response.status === "error" ? (
        <div className="mt-2 rounded-xl border border-line bg-chip px-4 py-3">
          <p className="text-sm text-fg">{response.error}</p>
          {response.errorKind === "not_connected" ? (
            <p className="mt-1 text-sm text-muted">Your API key may be missing. Mesh will not substitute another model.</p>
          ) : null}
          {response.errorKind === "unavailable" ? (
            <p className="mt-1 text-sm text-muted">Nothing else will answer in its place.</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={cn("h-11 rounded-full bg-surface-2 px-4 text-sm", focusRing)}
              onClick={() => void runResponse(conv.id, turn.id, response.id, [])}
            >
              Retry
            </button>
            {response.errorKind === "not_connected" ? (
              <button
                type="button"
                className={cn("h-11 rounded-full px-4 text-sm text-muted hover:text-fg", focusRing)}
                onClick={() => meshActions.openSettings("api-keys")}
              >
                Manage API key
              </button>
            ) : (
              <button
                type="button"
                className={cn("h-11 rounded-full px-4 text-sm text-muted hover:text-fg", focusRing)}
                onClick={() => meshActions.removeParticipant(response.modelId)}
              >
                Remove {name}
              </button>
            )}
          </div>
        </div>
      ) : null}
      {!collapsed && response.content ? (
        <div className="mt-2 rounded-xl border border-line bg-chip px-4 py-3">
          <RichText text={response.content} />
          {response.status === "streaming" ? (
            <span className="ml-0.5 inline-block h-4 w-px bg-fg align-middle motion-safe:animate-pulse" aria-hidden />
          ) : null}
        </div>
      ) : null}

      {!collapsed && (response.content || showBody) && response.status !== "thinking" && response.status !== "waiting" && response.status !== "error" ? (
        <div className="mt-1 flex items-center gap-1 text-muted">
          <button type="button" onClick={() => void copy()} className={cn("inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm hover:text-fg", focusRing)}>
            <Copy className="size-4" aria-hidden /> Copy
          </button>
          <button
            type="button"
            onClick={() => void runResponse(conv.id, turn.id, response.id, [])}
            className={cn("inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm hover:text-fg", focusRing)}
          >
            <RefreshCw className="size-4" aria-hidden /> Regenerate
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className={cn("grid size-11 place-items-center rounded-lg hover:text-fg", focusRing)} aria-label="More actions">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="mesh-pop z-50 min-w-40 rounded-xl border border-line bg-surface p-1 shadow-pop" align="start">
                <DropdownMenu.Item
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-surface-2"
                  onSelect={onToggle}
                >
                  Collapse
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      ) : null}
      {collapsed ? null : null}
    </article>
  );
}

export function Transcript({ conversation }: { conversation: Conversation }) {
  const profile = useMesh((s) => s.profile);
  const density = useMesh((s) => s.density);
  const showTimestamps = useMesh((s) => s.showTimestamps);
  const query = useMesh((s) => s.searchQuery).trim().toLowerCase();
  const searchOpen = useMesh((s) => s.searchOpen);
  const endRef = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const turns = conversation.turns.filter((turn) => {
    if (!searchOpen || !query) return true;
    if (turn.content.toLowerCase().includes(query)) return true;
    return turn.responses.some((r) => r.content.toLowerCase().includes(query) || (r.error ?? "").toLowerCase().includes(query));
  });

  useEffect(() => {
    const el = scroller.current;
    if (!el || !stick.current) return;
    el.scrollTop = el.scrollHeight;
  }, [conversation.id, conversation.turns, conversation.updatedAt]);

  const latestId = conversation.turns[conversation.turns.length - 1]?.id;
  const rightUser = conversation.mode === "independent";

  return (
    <div
      ref={scroller}
      className="min-h-0 flex-1 overflow-y-auto px-3 py-4 lg:px-6"
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
    >
      <div className="mx-auto w-full max-w-4xl">
        {searchOpen && query && turns.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">No messages match “{query}”.</p>
        ) : null}
        {turns.map((turn) => (
          <section
            key={turn.id}
            className={cn("border-b border-line/70 py-5", density === "compact" && "py-3")}
          >
            <div className={cn("flex w-full", rightUser ? "justify-end" : "justify-end lg:justify-start")}>
              <div className={cn("flex max-w-[min(100%,34rem)] gap-2", rightUser ? "flex-row-reverse" : "flex-row-reverse lg:flex-row")}>
                <Avatar name={profile.name} src={profile.avatar} />
                <div className={cn(rightUser ? "text-right" : "text-right lg:text-left")}>
                  <div className={cn("mb-1 flex items-center gap-2 text-xs text-faint", rightUser ? "justify-end" : "justify-end lg:justify-start")}>
                    <span className="text-sm font-medium text-fg">You</span>
                    {showTimestamps ? <time>{turn.timeLabel}</time> : null}
                  </div>
                  {turn.attachments.length > 0 ? (
                    <div className={cn("mb-2 flex flex-wrap gap-2", rightUser ? "justify-end" : "justify-end lg:justify-start")}>
                      {turn.attachments.map((file) => (
                        <FileRow key={file.id} file={file} />
                      ))}
                    </div>
                  ) : null}
                  {turn.content ? (
                    <div className="inline-block rounded-2xl bg-bubble px-4 py-2.5 text-left">
                      <p className="mesh-copy whitespace-pre-wrap leading-relaxed">{turn.content}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-faint">Mesh responses</p>
            {turn.responses.map((response) => {
              const defaultCollapsed = conversation.mode === "independent" && turn.id !== latestId && response.status === "completed";
              const collapsed = openIds[response.id] ?? defaultCollapsed;
              return (
                <ResponseCard
                  key={response.id}
                  conv={conversation}
                  turn={turn}
                  response={response}
                  collapsed={Boolean(collapsed)}
                  showTimestamps={showTimestamps}
                  onToggle={() => setOpenIds((m) => ({ ...m, [response.id]: !collapsed }))}
                />
              );
            })}
            </div>
          </section>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
