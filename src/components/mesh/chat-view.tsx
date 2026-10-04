import { Bookmark, Menu, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { meshActions, useMesh } from "@/lib/mesh/store";
import { cn } from "@/lib/cn";
import { focusRing } from "./bits";
import { Composer } from "./composer";
import { Mark } from "./logo";
import { Transcript } from "./transcript";

export function ChatView() {
  const conv = useMesh((s) => s.conversations.find((c) => c.id === s.activeId) ?? null);
  const draftModels = useMesh((s) => s.draftModels);
  const count = conv?.modelIds.length ?? draftModels.length;

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 px-3 pt-safe lg:px-4">
        <div className="flex items-center gap-2 py-2">
          <button
            type="button"
            className={cn("grid size-9 place-items-center rounded-full text-fg", focusRing)}
            aria-label="Open conversations"
            onClick={() => {
              if (window.matchMedia("(min-width: 1024px)").matches) meshActions.toggleSidebar();
              else meshActions.setDrawer(true);
            }}
          >
            <Menu className="size-5" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <ConversationMenu id={conv?.id} saved={conv?.saved} />
            <Mark className="h-6" />
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] text-muted">
              {count} {count === 1 ? "model" : "models"}
            </span>
          </div>
        </div>
      </header>

      {conv && conv.turns.length > 0 ? (
        <Transcript conversation={conv} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
          <Mark className="h-8" />
          <p className="mt-3 text-sm text-muted">One task, multiple minds.</p>
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
    return null;
  }
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={cn("grid size-8 place-items-center rounded-full text-muted", focusRing)} aria-label="Conversation actions">
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <MenuItems id={id} saved={saved} />
    </DropdownMenu.Root>
  );
}
