import { ArrowUp, ChevronDown, Paperclip, Square, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { MODE_META, providerById } from "@/lib/mesh/catalog";
import { runTurn, stopConversation } from "@/lib/mesh/engine";
import { fileKind, formatBytes } from "@/lib/mesh/format";
import {
  activeConversation,
  conversationRunning,
  meshActions,
  participantIds,
  participantMode,
  useMesh,
} from "@/lib/mesh/store";
import type { Attachment, WorkMode } from "@/lib/mesh/types";
import { thumbUrl } from "@/lib/mesh/thumbs";
import { cn } from "@/lib/cn";
import { focusRing } from "./bits";
import { ModelMark } from "./model-mark";
import { toast } from "sonner";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FileCode, FileSpreadsheet, FileText, ImageIcon } from "lucide-react";

const ACCEPT =
  ".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.webp,.json,.md,.js,.ts,.tsx,.py,.css,.html,.svg";

function FileGlyph({ name, mime }: { name: string; mime: string }) {
  const kind = fileKind(name, mime);
  const Icon = kind === "image" ? ImageIcon : kind === "sheet" ? FileSpreadsheet : kind === "code" ? FileCode : FileText;
  return <Icon className="size-4 shrink-0 text-muted" aria-hidden />;
}

function AttachmentChip({ file }: { file: Attachment }) {
  const preview = file.status !== "failed" ? thumbUrl(file.id) : undefined;
  return (
    <div className="flex max-w-full items-center gap-2 rounded-xl border border-line bg-chip py-1.5 pl-2 pr-1">
      {preview ? (
        <img src={preview} alt="" className="size-9 rounded-lg object-cover" />
      ) : (
        <span className="grid size-9 place-items-center rounded-lg bg-surface-2">
          <FileGlyph name={file.name} mime={file.mime} />
        </span>
      )}
      <span className="min-w-0">
        <span className="block max-w-40 truncate text-sm">{file.name}</span>
        <span className={cn("block text-xs", file.status === "failed" ? "text-danger" : "text-faint")}>
          {file.status === "uploading" ? "Uploading…" : file.status === "failed" ? file.error : formatBytes(file.size)}
        </span>
      </span>
      <button
        type="button"
        className={cn("grid size-11 place-items-center rounded-full text-muted hover:text-fg", focusRing)}
        aria-label={`Remove ${file.name}`}
        onClick={() => meshActions.removePending(file.id)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function Composer({ onNeedModels }: { onNeedModels: () => void }) {
  const draft = useMesh((s) => s.draft);
  const pending = useMesh((s) => s.pending);
  const focusTick = useMesh((s) => s.focusTick);
  const state = useMesh();
  const modelIds = participantIds(state);
  const mode = participantMode(state);
  const running = conversationRunning(activeConversation(state));
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  useEffect(() => {
    if (focusTick) boxRef.current?.focus();
  }, [focusTick]);

  function send() {
    if (running) {
      const id = useMesh.getState().activeId;
      if (id) stopConversation(id);
      return;
    }
    const result = meshActions.prepareSend();
    if ("error" in result) {
      if (result.error.startsWith("Choose")) onNeedModels();
      else toast(result.error);
      return;
    }
    void runTurn(result.convId, result.turnId);
  }

  function onFiles(list: FileList | null) {
    if (!list?.length) return;
    meshActions.addFiles(Array.from(list));
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div
      className="shrink-0 px-3 pt-2 pb-safe lg:px-6"
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onFiles(e.dataTransfer.files);
      }}
    >
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-line bg-surface p-2">
        {pending.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-1 pb-2">
            {pending.map((file) => (
              <AttachmentChip key={file.id} file={file} />
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-1">
          <button
            type="button"
            className={cn("grid size-11 place-items-center rounded-full text-muted hover:bg-chip hover:text-fg", focusRing)}
            aria-label="Attach a file"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="size-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            accept={ACCEPT}
            multiple
            onChange={(e) => onFiles(e.target.files)}
          />
          <textarea
            ref={boxRef}
            rows={1}
            value={draft}
            onChange={(e) => meshActions.setDraft(e.target.value)}
            placeholder="Message Mesh…"
            aria-label="Message Mesh"
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base text-fg outline-none placeholder:text-faint"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && useMesh.getState().enterToSend) {
                e.preventDefault();
                send();
              }
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line/80 px-1 pb-1 pt-2">
          <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
            {modelIds.length} {modelIds.length === 1 ? "model" : "models"}
          </span>
          {modelIds.length === 0 ? (
            <button
              type="button"
              onClick={onNeedModels}
              className={cn(
                "inline-flex h-11 items-center rounded-full border border-dashed border-line-strong px-3 text-sm text-muted",
                focusRing,
              )}
            >
              Add models
            </button>
          ) : (
            modelIds.map((id) => (
              <span
                key={id}
                className="inline-flex h-8 items-center gap-0.5 rounded-full border border-line bg-chip pl-0.5 pr-0.5"
              >
                <button
                  type="button"
                  className={cn("grid size-7 place-items-center rounded-full", focusRing)}
                  onClick={onNeedModels}
                  aria-label={`Change models, ${providerById(id)?.name ?? id} selected`}
                >
                  <ModelMark id={id} className="size-5" />
                </button>
                <button
                  type="button"
                  className={cn("grid size-6 place-items-center rounded-full text-faint hover:text-fg", focusRing)}
                  aria-label={`Remove ${providerById(id)?.name ?? id}`}
                  onClick={() => meshActions.removeParticipant(id)}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))
          )}
          <div className="ml-auto flex items-center gap-1">
            <ModeMenu mode={mode} />
            <button
              type="button"
              onClick={send}
              disabled={!running && !draft.trim() && pending.every((p) => p.status !== "ready")}
              className={cn(
                "grid size-11 place-items-center rounded-full bg-inverse text-inverse-fg transition disabled:bg-surface-2 disabled:text-faint",
                focusRing,
              )}
              aria-label={running ? "Stop generating" : "Send message"}
            >
              {running ? <Square className="size-4 fill-current" /> : <ArrowUp className="size-5" />}
            </button>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-1.5 hidden max-w-4xl text-center text-xs text-faint sm:block">
        Local previews only. Mesh does not call a provider from this browser.
      </p>
    </div>
  );
}

function ModeMenu({ mode }: { mode: WorkMode }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-11 items-center gap-1 rounded-full px-3 text-sm text-muted hover:bg-chip hover:text-fg",
            focusRing,
          )}
          aria-label={`Work mode, ${MODE_META[mode].label}`}
        >
          {MODE_META[mode].label}
          <ChevronDown className="size-4" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="mesh-pop z-50 w-72 rounded-xl border border-line bg-surface p-1 shadow-pop"
        >
          {(Object.keys(MODE_META) as WorkMode[]).map((key) => (
            <DropdownMenu.Item
              key={key}
              onSelect={() => meshActions.setMode(key)}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-surface-2",
                mode === key && "bg-chip",
              )}
            >
              <span className="block text-sm font-medium">{MODE_META[key].label}</span>
              <span className="block text-xs text-muted">{MODE_META[key].hint}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
