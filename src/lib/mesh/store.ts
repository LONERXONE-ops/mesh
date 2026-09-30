import { create } from "zustand";
import {
  defaultAvailability,
  defaultConnections,
  providerById,
} from "./catalog";
import { formatTime, titleFrom, uid } from "./format";
import { forgetThumb, rememberThumb } from "./thumbs";
import type {
  AppView,
  Attachment,
  Connection,
  Conversation,
  Density,
  FontScale,
  PickerTarget,
  Profile,
  SettingsDetail,
  WorkMode,
} from "./types";

const KEY = "mesh.v1";
const MAX_FILE = 20 * 1024 * 1024;

export interface MeshState {
  view: AppView;
  detail: SettingsDetail | null;
  activeId: string | null;
  conversations: Conversation[];
  drawerOpen: boolean;
  sidebarHidden: boolean;
  pickerOpen: boolean;
  pickerTarget: PickerTarget;
  pickerSnapshot: string[] | null;
  searchOpen: boolean;
  searchQuery: string;
  renameId: string | null;
  deleteId: string | null;
  draft: string;
  draftModels: string[];
  draftMode: WorkMode;
  pending: Attachment[];
  defaultModelIds: string[];
  defaultMode: WorkMode;
  theme: "dark" | "light";
  density: Density;
  fontScale: FontScale;
  enterToSend: boolean;
  showTimestamps: boolean;
  profile: Profile;
  connections: Record<string, Connection>;
  availability: Record<string, boolean>;
  notifyResponses: boolean;
  notifyErrors: boolean;
  focusTick: number;
}

const initial = (): MeshState => ({
  view: "chat",
  detail: null,
  activeId: "c-business",
  conversations: [],
  drawerOpen: false,
  sidebarHidden: false,
  pickerOpen: false,
  pickerTarget: "participants",
  pickerSnapshot: null,
  searchOpen: false,
  searchQuery: "",
  renameId: null,
  deleteId: null,
  draft: "",
  draftModels: ["gemini", "groq", "claude"],
  draftMode: "balanced",
  pending: [],
  defaultModelIds: ["gemini", "groq", "claude"],
  defaultMode: "balanced",
  theme: "dark",
  density: "comfortable",
  fontScale: "md",
  enterToSend: true,
  showTimestamps: true,
  profile: { name: "You", email: "" },
  connections: defaultConnections(),
  availability: defaultAvailability(),
  notifyResponses: true,
  notifyErrors: true,
  focusTick: 0,
});

interface Persisted {
  v: 1;
  activeId: string | null;
  conversations: Conversation[];
  draft: string;
  draftModels: string[];
  draftMode: WorkMode;
  defaultModelIds: string[];
  defaultMode: WorkMode;
  theme: "dark" | "light";
  density: Density;
  fontScale: FontScale;
  enterToSend: boolean;
  showTimestamps: boolean;
  profile: Profile;
  connections: Record<string, Connection>;
  availability: Record<string, boolean>;
  notifyResponses: boolean;
  notifyErrors: boolean;
}

function repair(conversations: Conversation[]): Conversation[] {
  return conversations.map((c) => ({
    ...c,
    turns: c.turns.map((t) => ({
      ...t,
      responses: t.responses.map((r) => {
        if (r.status === "waiting" || r.status === "thinking" || r.status === "streaming") {
          return {
            ...r,
            status: "error" as const,
            errorKind: "stopped" as const,
            error: r.content ? undefined : "Generation stopped.",
            content: r.content,
          };
        }
        return r;
      }),
    })),
  }));
}

export const useMesh = create<MeshState>(initial);

export function activeConversation(s: MeshState) {
  return s.conversations.find((c) => c.id === s.activeId) ?? null;
}

export function participantIds(s: MeshState) {
  const conv = activeConversation(s);
  return conv ? conv.modelIds : s.draftModels;
}

export function participantMode(s: MeshState): WorkMode {
  const conv = activeConversation(s);
  return conv ? conv.mode : s.draftMode;
}

function patchConv(list: Conversation[], id: string, fn: (c: Conversation) => Conversation) {
  return list.map((c) => (c.id === id ? fn(c) : c));
}

export function conversationRunning(c: Conversation | null) {
  if (!c) return false;
  return c.turns.some((t) =>
    t.responses.some((r) => r.status === "waiting" || r.status === "thinking" || r.status === "streaming"),
  );
}

let saveTimer: number | undefined;

export function bindPersistence() {
  return useMesh.subscribe((state) => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      const snap: Persisted = {
        v: 1,
        activeId: state.activeId,
        conversations: state.conversations,
        draft: state.draft,
        draftModels: state.draftModels,
        draftMode: state.draftMode,
        defaultModelIds: state.defaultModelIds,
        defaultMode: state.defaultMode,
        theme: state.theme,
        density: state.density,
        fontScale: state.fontScale,
        enterToSend: state.enterToSend,
        showTimestamps: state.showTimestamps,
        profile: state.profile,
        connections: state.connections,
        availability: state.availability,
        notifyResponses: state.notifyResponses,
        notifyErrors: state.notifyErrors,
      };
      localStorage.setItem(KEY, JSON.stringify(snap));
      localStorage.setItem("mesh-theme", state.theme);
    }, 200);
  });
}

export function dumpMeshHistory() {
  const state = useMesh.getState();

  console.log("===== MESH HISTORY =====");

  for (const conversation of state.conversations) {
    console.log(`\\n### ${conversation.title} [${conversation.mode}]`);

    for (const turn of conversation.turns) {
      console.log(`\\nUSER: ${turn.content}`);

      for (const response of turn.responses) {
        console.log(`\\n${response.modelId.toUpperCase()}:`);
        console.log(response.content || `[${response.status}]`);
      }
    }
  }

  console.log("\\n===== END MESH HISTORY =====");
}

export function hydrateMesh() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Persisted;
    if (!data || data.v !== 1 || !Array.isArray(data.conversations)) return;

    const oldSeededIds = new Set([
      "launch-plan",
      "product-launch",
      "anime-recommendations",
      "writing-workshop",
    ]);

    const conversations = data.conversations.filter(
      (conversation) => !oldSeededIds.has(conversation.id),
    );

    useMesh.setState({
      activeId:
        data.activeId && conversations.some((conversation) => conversation.id === data.activeId)
          ? data.activeId
          : null,
      conversations: repair(conversations),
      draft: data.draft ?? "",
      draftModels: data.draftModels?.length ? data.draftModels : ["gemini", "groq"],
      draftMode: data.draftMode ?? "balanced",
      defaultModelIds: data.defaultModelIds ?? ["gemini", "groq"],
      defaultMode: data.defaultMode ?? "balanced",
      theme: data.theme === "light" ? "light" : "dark",
      density: data.density === "compact" ? "compact" : "comfortable",
      fontScale: data.fontScale ?? "md",
      enterToSend: data.enterToSend !== false,
      showTimestamps: data.showTimestamps !== false,
      profile: data.profile ?? initial().profile,
      connections: { ...defaultConnections(), ...data.connections },
      availability: { ...defaultAvailability(), ...data.availability },
      notifyResponses: data.notifyResponses !== false,
      notifyErrors: data.notifyErrors !== false,
    });
  } catch {
    /* ignore broken local data */
  }
}

export const meshActions = {
  setView(view: AppView) {
    useMesh.setState({ view, drawerOpen: false, detail: view === "settings" ? useMesh.getState().detail : null });
  },
  openSettings(detail: SettingsDetail | null = null) {
    useMesh.setState({ view: "settings", detail, drawerOpen: false });
  },
  setDetail(detail: SettingsDetail | null) {
    useMesh.setState({ detail });
  },
  setDrawer(drawerOpen: boolean) {
    useMesh.setState({ drawerOpen });
  },
  toggleSidebar() {
    useMesh.setState((s) => ({ sidebarHidden: !s.sidebarHidden }));
  },
  toggleSearch() {
    useMesh.setState((s) => ({ searchOpen: !s.searchOpen, searchQuery: s.searchOpen ? "" : s.searchQuery }));
  },
  setSearch(searchQuery: string) {
    useMesh.setState({ searchQuery });
  },
  newChat() {
    const s = useMesh.getState();
    useMesh.setState({
      view: "chat",
      activeId: null,
      draft: "",
      draftModels: [...s.defaultModelIds],
      draftMode: s.defaultMode,
      pending: [],
      drawerOpen: false,
      searchOpen: false,
      searchQuery: "",
      focusTick: s.focusTick + 1,
    });
  },
  openConversation(id: string) {
    useMesh.setState({
      view: "chat",
      activeId: id,
      drawerOpen: false,
      searchOpen: false,
      searchQuery: "",
      pending: [],
    });
  },
  setDraft(draft: string) {
    useMesh.setState({ draft });
  },
  setMode(mode: WorkMode) {
    const s = useMesh.getState();
    if (!s.activeId) {
      useMesh.setState({ draftMode: mode });
      return;
    }
    useMesh.setState({
      conversations: patchConv(s.conversations, s.activeId, (c) => ({ ...c, mode, updatedAt: Date.now() })),
    });
  },
  openPicker(target: PickerTarget) {
    const s = useMesh.getState();
    const ids = target === "defaults" ? s.defaultModelIds : participantIds(s);
    useMesh.setState({ pickerOpen: true, pickerTarget: target, pickerSnapshot: [...ids] });
  },
  closePicker(commit: boolean) {
    const s = useMesh.getState();
    if (!commit && s.pickerSnapshot) {
      if (s.pickerTarget === "defaults") {
        useMesh.setState({ defaultModelIds: s.pickerSnapshot, pickerOpen: false, pickerSnapshot: null });
        return;
      }
      if (s.activeId) {
        useMesh.setState({
          conversations: patchConv(s.conversations, s.activeId, (c) => ({ ...c, modelIds: s.pickerSnapshot! })),
          pickerOpen: false,
          pickerSnapshot: null,
        });
        return;
      }
      useMesh.setState({ draftModels: s.pickerSnapshot, pickerOpen: false, pickerSnapshot: null });
      return;
    }
    useMesh.setState({ pickerOpen: false, pickerSnapshot: null });
  },
  toggleListedModel(id: string) {
    const s = useMesh.getState();
    const apply = (ids: string[]) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
    if (s.pickerOpen && s.pickerTarget === "defaults") {
      useMesh.setState({ defaultModelIds: apply(s.defaultModelIds) });
      return;
    }
    if (s.activeId && (s.pickerOpen || s.view === "chat")) {
      useMesh.setState({
        conversations: patchConv(s.conversations, s.activeId, (c) => ({ ...c, modelIds: apply(c.modelIds) })),
      });
      return;
    }
    useMesh.setState({ draftModels: apply(s.draftModels) });
  },
  removeParticipant(id: string) {
    const s = useMesh.getState();
    if (s.activeId) {
      useMesh.setState({
        conversations: patchConv(s.conversations, s.activeId, (c) => ({
          ...c,
          modelIds: c.modelIds.filter((x) => x !== id),
        })),
      });
      return;
    }
    useMesh.setState({ draftModels: s.draftModels.filter((x) => x !== id) });
  },
  addFiles(files: File[]) {
    const s = useMesh.getState();
    const room = Math.max(0, 6 - s.pending.length);
    const next: Attachment[] = [];
    for (const file of files.slice(0, room)) {
      const id = uid("file");
      const tooBig = file.size > MAX_FILE;
      next.push({
        id,
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        status: tooBig ? "failed" : "uploading",
        error: tooBig ? "File is larger than 20 MB." : undefined,
      });
      if (!tooBig) rememberThumb(id, file);
    }
    useMesh.setState({ pending: [...s.pending, ...next] });
    for (const item of next) {
      if (item.status !== "uploading") continue;
      window.setTimeout(() => {
        useMesh.setState((state) => ({
          pending: state.pending.map((p) => (p.id === item.id ? { ...p, status: "ready" } : p)),
        }));
      }, 700);
    }
  },
  removePending(id: string) {
    forgetThumb(id);
    useMesh.setState((s) => ({ pending: s.pending.filter((p) => p.id !== id) }));
  },
  askRename(id: string) {
    useMesh.setState({ renameId: id });
  },
  askDelete(id: string) {
    useMesh.setState({ deleteId: id });
  },
  closePrompts() {
    useMesh.setState({ renameId: null, deleteId: null });
  },
  rename(id: string, title: string) {
    const clean = title.replace(/\s+/g, " ").trim();
    if (!clean) return;
    useMesh.setState((s) => ({
      conversations: patchConv(s.conversations, id, (c) => ({ ...c, title: clean.slice(0, 80), updatedAt: Date.now() })),
      renameId: null,
    }));
  },
  toggleSaved(id: string) {
    useMesh.setState((s) => ({
      conversations: patchConv(s.conversations, id, (c) => ({ ...c, saved: !c.saved, updatedAt: Date.now() })),
    }));
  },
  deleteConversation(id: string) {
    useMesh.setState((s) => {
      const conversations = s.conversations.filter((c) => c.id !== id);
      return {
        conversations,
        activeId: s.activeId === id ? (conversations[0]?.id ?? null) : s.activeId,
        deleteId: null,
        view: "chat",
      };
    });
  },
  prepareSend(): { convId: string; turnId: string } | { error: string } {
    const s = useMesh.getState();
    const text = s.draft.trim();
    if (s.pending.some((p) => p.status === "uploading")) {
      return { error: "Wait for attachments to finish." };
    }
    const readyFiles = s.pending.filter((p) => p.status === "ready");
    if (!text && readyFiles.length === 0) return { error: "Write a message first." };
    const models = participantIds(s);
    if (models.length === 0) return { error: "Choose at least one model." };
    const convExisting = activeConversation(s);
    if (convExisting && conversationRunning(convExisting)) return { error: "Wait for the current replies, or stop them." };

    const turnId = uid("turn");
    const now = Date.now();
    const turn = {
      id: turnId,
      content: text,
      attachments: readyFiles.map((f) => ({ ...f })),
      createdAt: now,
      timeLabel: formatTime(now),
      responses: models.map((modelId) => ({
        id: uid("res"),
        modelId,
        status: "waiting" as const,
        content: "",
      })),
    };

    let convId = s.activeId;
    let conversations = s.conversations;
    if (!convId || !convExisting) {
      convId = uid("conv");
      const conv: Conversation = {
        id: convId,
        title: titleFrom(text, readyFiles[0]?.name ?? "New conversation"),
        createdAt: now,
        updatedAt: now,
        mode: s.draftMode,
        modelIds: [...models],
        saved: false,
        turns: [turn],
      };
      conversations = [conv, ...conversations];
    } else {
      conversations = patchConv(conversations, convId, (c) => ({
        ...c,
        updatedAt: now,
        title: c.turns.length === 0 ? titleFrom(text, c.title) : c.title,
        turns: [...c.turns, turn],
      }));
    }

    for (const file of s.pending.filter((p) => p.status === "failed")) forgetThumb(file.id);
    useMesh.setState({
      conversations,
      activeId: convId,
      draft: "",
      pending: [],
      view: "chat",
    });
    return { convId: convId!, turnId };
  },
  patchResponse(
    convId: string,
    turnId: string,
    responseId: string,
    patch: Partial<Conversation["turns"][number]["responses"][number]>,
  ) {
    useMesh.setState((s) => ({
      conversations: patchConv(s.conversations, convId, (c) => ({
        ...c,
        updatedAt: Date.now(),
        turns: c.turns.map((t) =>
          t.id !== turnId
            ? t
            : {
                ...t,
                responses: t.responses.map((r) => (r.id === responseId ? { ...r, ...patch } : r)),
              },
        ),
      })),
    }));
  },
  setAvailability(id: string, available: boolean) {
    useMesh.setState((s) => ({ availability: { ...s.availability, [id]: available } }));
  },
  connectProvider(id: string, hint: string) {
    useMesh.setState((s) => ({
      connections: { ...s.connections, [id]: { connected: true, hint } },
    }));
  },
  disconnectProvider(id: string) {
    useMesh.setState((s) => ({
      connections: { ...s.connections, [id]: { connected: false, hint: "" } },
    }));
  },
  setDefaultMode(defaultMode: WorkMode) {
    useMesh.setState({ defaultMode });
  },
  updateProfile(patch: Partial<Profile>) {
    useMesh.setState((s) => ({ profile: { ...s.profile, ...patch } }));
  },
  setTheme(theme: "dark" | "light") {
    useMesh.setState({ theme });
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("mesh-theme", theme);
  },
  setDensity(density: Density) {
    useMesh.setState({ density });
  },
  setFontScale(fontScale: FontScale) {
    useMesh.setState({ fontScale });
  },
  setEnterToSend(enterToSend: boolean) {
    useMesh.setState({ enterToSend });
  },
  setShowTimestamps(showTimestamps: boolean) {
    useMesh.setState({ showTimestamps });
  },
  setNotify(which: "responses" | "errors", value: boolean) {
    if (which === "responses") useMesh.setState({ notifyResponses: value });
    else useMesh.setState({ notifyErrors: value });
  },
  clearHistory() {
    useMesh.setState({ conversations: [], activeId: null, view: "chat" });
  },
  resetLocal() {
    localStorage.removeItem(KEY);
    const next = initial();
    useMesh.setState({ ...next, view: "settings", detail: "data" });
  },
};

export function maskedKey(hint: string) {
  if (!hint) return "";
  return `••••••••${hint}`;
}

export function providerReady(id: string, s: MeshState) {
  const def = providerById(id);
  if (!def) return { ok: false as const, errorKind: "failed" as const, error: "Unknown model." };
  if (s.availability[id] === false) {
    return { ok: false as const, errorKind: "unavailable" as const, error: `${def.name} is currently unavailable.` };
  }
  if (def.kind === "byok" && !s.connections[id]?.connected) {
    return {
      ok: false as const,
      errorKind: "not_connected" as const,
      error: `Connect your API key to use ${def.name}.`,
    };
  }
  return { ok: true as const };
}
