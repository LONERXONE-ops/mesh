import { Bookmark, ChevronLeft, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { dayBucket, formatTime } from "@/lib/mesh/format";
import { providerById } from "@/lib/mesh/catalog";
import { meshActions, useMesh } from "@/lib/mesh/store";
import { cn } from "@/lib/cn";
import { focusRing } from "./bits";

export function HistoryView({ savedOnly = false }: { savedOnly?: boolean }) {
  const conversations = useMesh((s) => s.conversations);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...conversations]
      .filter((c) => (savedOnly ? c.saved : true))
      .filter((c) => !q || c.title.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [conversations, query, savedOnly]);

  const groups = ["Today", "Yesterday", "Earlier"]
    .map((label) => ({ label, items: filtered.filter((c) => dayBucket(c.updatedAt) === label) }))
    .filter((g) => g.items.length);

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-line px-4 py-4 pt-safe lg:px-8">
        <div className="mb-3 flex items-center gap-2 lg:hidden">
          <button
            type="button"
            className={cn("grid size-11 place-items-center rounded-full text-fg", focusRing)}
            aria-label="Open menu"
            onClick={() => meshActions.setDrawer(true)}
          >
            <ChevronLeft className="size-5" />
          </button>
        </div>
        <h1 className="text-xl font-semibold">{savedOnly ? "Saved" : "Conversations"}</h1>
        <p className="mt-1 text-sm text-muted">
          {savedOnly ? "Conversations you kept to come back to." : "Every Mesh conversation on this device."}
        </p>
        <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3">
          <Search className="size-4 text-faint" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={savedOnly ? "Search saved" : "Search conversations"}
            aria-label={savedOnly ? "Search saved" : "Search conversations"}
            className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
          />
        </label>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-8">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            {savedOnly ? "Nothing saved yet. Save a conversation from its menu." : "No conversations match."}
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="mb-6">
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">{group.label}</h2>
              <ul className="overflow-hidden rounded-2xl border border-line">
                {group.items.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => meshActions.openConversation(c.id)}
                      className={cn("min-h-14 min-w-0 flex-1 px-4 py-3 text-left hover:bg-surface", focusRing)}
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{c.title}</span>
                        {c.saved ? <Bookmark className="size-3.5 text-faint" aria-label="Saved" /> : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-faint">
                        {formatTime(c.updatedAt)} · {c.modelIds.map((id) => providerById(id)?.name ?? id).join(", ")}
                      </span>
                    </button>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button type="button" className={cn("mr-2 grid size-11 place-items-center rounded-full text-muted hover:text-fg", focusRing)} aria-label={`Actions for ${c.title}`}>
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content align="end" className="mesh-pop z-50 min-w-40 rounded-xl border border-line bg-surface p-1 shadow-pop">
                          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-surface-2" onSelect={() => meshActions.askRename(c.id)}>
                            <Pencil className="size-4" /> Rename
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-surface-2" onSelect={() => meshActions.toggleSaved(c.id)}>
                            <Bookmark className="size-4" /> {c.saved ? "Unsave" : "Save"}
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger outline-none data-[highlighted]:bg-surface-2" onSelect={() => meshActions.askDelete(c.id)}>
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  );
}
