import type { ReactNode } from "react";
import { Bookmark, Boxes, ChevronRight, History, MessageSquarePlus, Settings, X } from "lucide-react";
import { providerById } from "@/lib/mesh/catalog";
import { meshActions, useMesh, type MeshState } from "@/lib/mesh/store";
import type { AppView } from "@/lib/mesh/types";
import { cn } from "@/lib/cn";
import { Avatar, focusRing } from "./bits";
import { Wordmark } from "./logo";

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition",
        focusRing,
        active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface hover:text-fg",
      )}
    >
      <span className="text-fg/80" aria-hidden>
        {icon}
      </span>
      {label}
    </button>
  );
}

function ConversationList() {
  const conversations = useMesh((s) => s.conversations);
  const activeId = useMesh((s) => s.activeId);
  const view = useMesh((s) => s.view);
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  if (!sorted.length) {
    return <p className="px-3 py-6 text-sm text-faint">No conversations yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {sorted.map((c) => {
        const active = view === "chat" && c.id === activeId;
        const names = c.modelIds.map((id) => providerById(id)?.name ?? id).join(", ");
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => meshActions.openConversation(c.id)}
              className={cn(
                "flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm transition",
                focusRing,
                active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface hover:text-fg",
              )}
              title={c.title}
            >
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              {c.saved ? <Bookmark className="size-3.5 shrink-0 text-faint" aria-label="Saved" /> : null}
              {active ? <span className="size-1.5 shrink-0 rounded-full bg-fg" aria-hidden /> : null}
              <span className="sr-only">{names}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const view = useMesh((s) => s.view);
  const profile = useMesh((s) => s.profile);
  const go = (next: AppView) => {
    meshActions.setView(next);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-4 pt-5">
        <Wordmark />
        {onNavigate ? (
          <button
            type="button"
            className={cn("grid size-11 place-items-center rounded-full text-muted hover:bg-surface hover:text-fg", focusRing)}
            aria-label="Close menu"
            onClick={onNavigate}
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 px-3">
        <button
          type="button"
          onClick={() => {
            meshActions.newChat();
            onNavigate?.();
          }}
          className={cn(
            "flex h-11 items-center gap-3 rounded-xl border border-line bg-surface px-3 text-sm font-medium transition hover:border-line-strong",
            focusRing,
          )}
        >
          <MessageSquarePlus className="size-4" aria-hidden />
          New conversation
        </button>
        <NavButton icon={<History className="size-4" />} label="Conversations" active={view === "history"} onClick={() => go("history")} />
        <NavButton icon={<Bookmark className="size-4" />} label="Saved" active={view === "saved"} onClick={() => go("saved")} />
        <NavButton
          icon={<Boxes className="size-4" />}
          label="Models"
          onClick={() => {
            meshActions.openPicker("participants");
            onNavigate?.();
          }}
        />
      </div>
      {view === "settings" ? (
        <div className="mt-2 px-3">
          <NavButton icon={<Settings className="size-4" />} label="Settings" active onClick={() => go("settings")} />
        </div>
      ) : (
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <ConversationList />
        </div>
      )}
      <div className={cn("mt-auto border-t border-line px-3 py-3", view !== "settings" && "mt-0")}>
        {view === "settings" ? (
          <button
            type="button"
            onClick={() => meshActions.openSettings("profile")}
            className={cn("flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface", focusRing)}
          >
            <Avatar name={profile.name} src={profile.avatar} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{profile.name}</span>
              <span className="block truncate text-xs text-muted">{profile.email}</span>
            </span>
            <ChevronRight className="size-4 text-faint" aria-hidden />
          </button>
        ) : (
          <NavButton icon={<Settings className="size-4" />} label="Settings" active={false} onClick={() => go("settings")} />
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const hidden = useMesh((s: MeshState) => s.sidebarHidden);
  if (hidden) return null;
  return (
    <aside className="hidden h-full min-h-0 w-72 shrink-0 flex-col overflow-hidden border-r border-line bg-bg lg:flex">
      <SidebarBody />
    </aside>
  );
}

export function MobileDrawer() {
  const open = useMesh((s) => s.drawerOpen);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-inverse/50"
        aria-label="Close menu"
        onClick={() => meshActions.setDrawer(false)}
      />
      <div className="mesh-pop absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col border-r border-line bg-bg pt-safe shadow-pop">
        <SidebarBody onNavigate={() => meshActions.setDrawer(false)} />
      </div>
    </div>
  );
}
