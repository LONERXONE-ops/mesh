import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Toaster, toast } from "sonner";
import { bindCloudPersistence, bindPersistence, hydrateCloudProfile, hydrateCloudStorage, hydrateMesh, meshActions, useMesh } from "@/lib/mesh/store";
import { cn } from "@/lib/cn";
import { focusRing, inputClass } from "./bits";
import { ChatView } from "./chat-view";
import { HistoryView } from "./history-view";
import { MobileDrawer, Sidebar } from "./sidebar";
import { ModelPicker } from "./model-picker";
import { SettingsView } from "./settings-view";

export function MeshApp() {
  const view = useMesh((s) => s.view);
  const theme = useMesh((s) => s.theme);
  const fontScale = useMesh((s) => s.fontScale);
  const density = useMesh((s) => s.density);
  const activeTitle = useMesh((s) => s.conversations.find((c) => c.id === s.activeId)?.title);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateMesh();
    setReady(true);

    const unbindLocal = bindPersistence();
    let unbindCloud: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      await hydrateCloudStorage();
      await hydrateCloudProfile();

      if (!cancelled) {
        unbindCloud = bindCloudPersistence();
      }
    })();

    return () => {
      cancelled = true;
      unbindLocal();
      unbindCloud?.();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.text = fontScale;
    root.dataset.density = density;
    localStorage.setItem("mesh-theme", theme);
  }, [ready, theme, fontScale, density]);

  useEffect(() => {
    document.title = view === "chat" && activeTitle ? `${activeTitle} · Mesh` : "Mesh";
  }, [view, activeTitle]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const s = useMesh.getState();
      if (s.pickerOpen) meshActions.closePicker(false);
      else if (s.drawerOpen) meshActions.setDrawer(false);
      else if (s.renameId || s.deleteId) meshActions.closePrompts();
      else if (s.searchOpen) meshActions.toggleSearch();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-bg text-fg">
      <Sidebar />
      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {view === "chat" ? <ChatView /> : null}
        {view === "history" ? <HistoryView /> : null}
        {view === "saved" ? <HistoryView savedOnly /> : null}
        {view === "settings" ? <SettingsView /> : null}
      </main>
      <MobileDrawer />
      <ModelPicker />
      <RenameDialog />
      <DeleteDialog />
      <Toaster theme={theme === "light" ? "light" : "dark"} position="bottom-center" />
    </div>
  );
}

function RenameDialog() {
  const id = useMesh((s) => s.renameId);
  const current = useMesh((s) => s.conversations.find((c) => c.id === id)?.title ?? "");
  const [value, setValue] = useState(current);
  useEffect(() => setValue(current), [current, id]);
  return (
    <Dialog.Root open={Boolean(id)} onOpenChange={(open) => !open && meshActions.closePrompts()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-inverse/60" />
        <Dialog.Content className="mesh-pop fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-5 shadow-pop">
          <Dialog.Title className="text-base font-semibold">Rename conversation</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">This name is only on this device.</Dialog.Description>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!id) return;
              meshActions.rename(id, value);
              toast("Renamed");
            }}
          >
            <input className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Conversation name" autoFocus maxLength={80} />
            <div className="flex justify-end gap-2">
              <button type="button" className={cn("h-11 rounded-full px-4 text-sm text-muted", focusRing)} onClick={() => meshActions.closePrompts()}>
                Cancel
              </button>
              <button type="submit" className={cn("h-11 rounded-full bg-inverse px-4 text-sm font-medium text-inverse-fg", focusRing)}>
                Save
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DeleteDialog() {
  const id = useMesh((s) => s.deleteId);
  const title = useMesh((s) => s.conversations.find((c) => c.id === id)?.title ?? "this conversation");
  return (
    <Dialog.Root open={Boolean(id)} onOpenChange={(open) => !open && meshActions.closePrompts()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-inverse/60" />
        <Dialog.Content className="mesh-pop fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-5 shadow-pop">
          <Dialog.Title className="text-base font-semibold">Delete conversation</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">
            Delete “{title}”? This only removes it from this browser.
          </Dialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={cn("h-11 rounded-full px-4 text-sm text-muted", focusRing)} onClick={() => meshActions.closePrompts()}>
              Cancel
            </button>
            <button
              type="button"
              className={cn("h-11 rounded-full bg-danger px-4 text-sm font-medium text-inverse", focusRing)}
              onClick={() => {
                if (!id) return;
                meshActions.deleteConversation(id);
                toast("Deleted");
              }}
            >
              Delete
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
