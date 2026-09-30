import { Bookmark, ChevronDown, ChevronLeft, MoreHorizontal, PanelLeft, Pencil, Search, Trash2, X } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MODE_META } from "@/lib/mesh/catalog";
import { meshActions, useMesh } from "@/lib/mesh/store";
import type { Conversation } from "@/lib/mesh/types";
import { cn } from "@/lib/cn";
import { focusRing } from "./bits";
import { Composer } from "./composer";
import { Mark } from "./logo";
import { Wordmark } from "./logo";
import { Transcript } from "./transcript";

const SUGGESTIONS = [
  "Help me understand this business idea.",
  "Give me five ideas for my website.",
  "What are the key risks I should consider?",
];

function subtitle(conv: Conversation | null, count: number, mode: Conversation["mode"] | ReturnType<typeof useMesh.getState>["draftMode"]) {
  const models = `${count} ${count === 1 ? "model" : "models"}`;
  return `${models} · ${MODE_META[mode].subtitle}`;
}

export function ChatView() {
  const conv = useMesh((s) => s.conversations.find((c) => c.id === s.activeId) ?? null);
  const draftMode = useMesh((s) => s.draftMode);
  const draftModels = useMesh((s) => s.draftModels);
  const searchOpen = useMesh((s) => s.searchOpen);
  const searchQuery = useMesh((s) => s.searchQuery);
  const sidebarHidden = useMesh((s) => s.sidebarHidden);
  const mode = conv?.mode ?? draftMode;
  const count = conv?.modelIds.length ?? draftModels.length;
  const title = conv?.title ?? "New conversation";

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-line px-2 pt-safe lg:px-4">
        <div className="flex items-center gap-1 lg:hidden">
          <button
            type="button"
            className={cn("grid size-11 place-items-center rounded-full text-fg", focusRing)}
            aria-label="Open conversations"
            onClick={() => meshActions.setDrawer(true)}
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex flex-1 justify-center">
            <Wordmark className="[&_img]:h-6" />
          </div>
          <ConversationMenu id={conv?.id} saved={conv?.saved} compact />
        </div>
        <div className="mx-auto flex w-full max-w-4xl items-center gap-2 py-2 lg:py-3">
          {sidebarHidden ? (
            <button
              type="button"
              className={cn("hidden size-11 place-items-center rounded-full text-muted hover:bg-surface hover:text-fg lg:grid", focusRing)}
              aria-label="Show sidebar"
              onClick={() => meshActions.toggleSidebar()}
            >
              <PanelLeft className="size-5" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1 text-center lg:text-left">
            {searchOpen ? (
              <div className="flex items-center gap-2">
                <Search className="size-4 text-faint" aria-hidden />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => meshActions.setSearch(e.target.value)}
                  placeholder="Search this conversation"
                  aria-label="Search this conversation"
                  className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-faint"
                />
                <button type="button" className={cn("grid size-11 place-items-center", focusRing)} aria-label="Close search" onClick={() => meshActions.toggleSearch()}>
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-1 lg:justify-start">
                  <h1 className="truncate text-base font-medium">{title}</h1>
                  {conv ? (
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button type="button" className={cn("grid size-8 place-items-center rounded-full text-muted hover:text-fg", focusRing)} aria-label="Conversation actions">
                          <ChevronDown className="size-4" />
                        </button>
                      </DropdownMenu.Trigger>
                      <MenuItems id={conv.id} saved={conv.saved} />
                    </DropdownMenu.Root>
                  ) : null}
                </div>
                <p className="text-xs text-faint">{subtitle(conv, count, mode)}</p>
              </>
            )}
          </div>
          <div className="hidden items-center lg:flex">
            <button
              type="button"
              className={cn("grid size-11 place-items-center rounded-full text-muted hover:bg-surface hover:text-fg", focusRing)}
              aria-label="Search conversation"
              onClick={() => meshActions.toggleSearch()}
            >
              <Search className="size-5" />
            </button>
            <button
              type="button"
              className={cn("grid size-11 place-items-center rounded-full text-muted hover:bg-surface hover:text-fg", focusRing)}
              aria-label={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
              onClick={() => meshActions.toggleSidebar()}
            >
              <PanelLeft className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {conv && conv.turns.length > 0 ? (
        <Transcript conversation={conv} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 text-center">
          <Mark className="h-16" />
          <h2 className="mt-6 text-balance text-2xl font-semibold tracking-tight">One task, multiple minds.</h2>
          <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted">
            Choose the models you want. Mesh gives each of them the same message and keeps every answer in one conversation.
          </p>
          <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((text) => (
              <button
                key={text}
                type="button"
                className={cn("h-11 rounded-full border border-line bg-surface px-4 text-sm text-muted hover:text-fg", focusRing)}
                onClick={() => {
                  meshActions.setDraft(text);
                  useMesh.setState((s) => ({ focusTick: s.focusTick + 1 }));
                }}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      )}
      <Composer onNeedModels={() => meshActions.openPicker("participants")} />
    </section>
  );
}

function MenuItems({ id, saved }: { id: string; saved?: boolean }) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content align="start" className="mesh-pop z-50 min-w-44 rounded-xl border border-line bg-surface p-1 shadow-pop">
        <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-surface-2" onSelect={() => meshActions.askRename(id)}>
          <Pencil className="size-4" aria-hidden /> Rename
        </DropdownMenu.Item>
        <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-surface-2" onSelect={() => meshActions.toggleSaved(id)}>
          <Bookmark className="size-4" aria-hidden /> {saved ? "Unsave" : "Save"}
        </DropdownMenu.Item>
        <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger outline-none data-[highlighted]:bg-surface-2" onSelect={() => meshActions.askDelete(id)}>
          <Trash2 className="size-4" aria-hidden /> Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

function ConversationMenu({ id, saved, compact }: { id?: string; saved?: boolean; compact?: boolean }) {
  if (!id) {
    return <span className="size-11" />;
  }
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={cn("grid size-11 place-items-center rounded-full text-fg", focusRing)} aria-label="Conversation actions">
          <MoreHorizontal className="size-5" />
        </button>
      </DropdownMenu.Trigger>
      <MenuItems id={id} saved={saved} />
    </DropdownMenu.Root>
  );
}
