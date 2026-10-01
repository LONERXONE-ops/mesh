import { create } from "zustand";
import { providerById } from "./catalog";
import { formatTime, titleFrom, uid } from "./format";
import { forgetThumb, rememberAttachment, rememberThumb } from "./thumbs";
import { uploadCloudFile } from "./cloud-storage";
import {
  deleteCloudConversation,
  loadCloudConversations,
  loadCloudProfile,
  migrateLocalConversations,
  saveCloudConversation,
  saveCloudProfile,
} from "./cloud-storage";
import type {
  AppView,
  Attachment,
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
const DEFAULT_MODELS = ["gemini", "groq"];

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
  notifyResponses: boolean;
  notifyErrors: boolean;
  focusTick: number;
}

const initial = (): MeshState => ({
  view: "chat",
  detail: null,
  activeId: null,
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
  draftModels: [...DEFAULT_MODELS],
  draftMode: "balanced",
  pending: [],
  defaultModelIds: [...DEFAULT_MODELS],
  defaultMode: "balanced",
  theme: "dark",
  density: "comfortable",
  fontScale: "md",
  enterToSend: true,
  showTimestamps: true,
  profile: { name: "You", email: "" },
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
  notifyResponses: boolean;
  notifyErrors: boolean;
}

function knownIds(ids: unknown, fallback: string[]) {
  if (!Array.isArray(ids)) return [...fallback];
  const next = ids.filter((id): id is string => typeof id === "string" && Boolean(providerById(id)));
  return next.length ? next : [...fallback];
}

function knownSelection(ids: unknown) {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === "string" && Boolean(providerById(id)));
}

function repair(conversations: Conversation[]): Conversation[] {
  return conversations.map((c) => ({
    ...c,
    modelIds: knownSelection(c.modelIds),
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

function forgetConversationFiles(conversation: Conversation | undefined) {
  if (!conversation) return;
  for (const turn of conversation.turns) {
    for (const file of turn.attachments) forgetThumb(file.id);
  }
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
let cloudSyncTimer: number | undefined;
let cloudHydrated = false;
let cloudMigrated = false;
let previousConversationIds = new Set<string>();

function scheduleCloudSync(conversations: Conversation[]) {
  window.clearTimeout(cloudSyncTimer);

  cloudSyncTimer = window.setTimeout(async () => {
    for (const conversation of conversations) {
      await saveCloudConversation(conversation);
    }

    const currentIds = new Set(conversations.map((c) => c.id));

    for (const id of previousConversationIds) {
      if (!currentIds.has(id)) {
        await deleteCloudConversation(id);
      }
    }

    previousConversationIds = currentIds;
  }, 500);
}

export async function hydrateCloudStorage() {
  if (cloudHydrated) return;

  cloudHydrated = true;

  const state = useMesh.getState();
  const localConversations = state.conversations;

  const cloudConversations = await loadCloudConversations();

  if (cloudConversations === null) {
    previousConversationIds = new Set(localConversations.map((c) => c.id));
    return;
  }

  if (cloudConversations.length === 0 && localConversations.length > 0 && !cloudMigrated) {
    cloudMigrated = await migrateLocalConversations(localConversations);
    previousConversationIds = new Set(localConversations.map((c) => c.id));
    return;
  }

  const localById = new Map(localConversations.map((c) => [c.id, c]));
  const cloudById = new Map(cloudConversations.map((c) => [c.id, c]));

  for (const local of localConversations) {
    const cloud = cloudById.get(local.id);

    if (!cloud || local.updatedAt > cloud.updatedAt) {
      await saveCloudConversation(local);
      cloudById.set(local.id, local);
    }
  }

  const merged = Array.from(cloudById.values()).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );

  useMesh.setState({
    conversations: merged,
    activeId:
      state.activeId && merged.some((c) => c.id === state.activeId)
        ? state.activeId
        : merged[0]?.id ?? null,
  });

  previousConversationIds = new Set(merged.map((c) => c.id));
}

export function bindCloudPersistence() {
  return useMesh.subscribe((state) => {
    scheduleCloudSync(state.conversations);
  });
}

export async function hydrateCloudProfile() {
  const profile = await loadCloudProfile();
  if (!profile) return;

  useMesh.setState((state) => ({
    profile: {
      ...state.profile,
      ...profile,
    },
  }));
}

export function syncProfile(profile: Profile) {
  void saveCloudProfile({
    name: profile.name,
    email: profile.email,
    ...(profile.avatar ? { avatar: profile.avatar } : {}),
  });
}


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
    console.log(`\n### ${conversation.title} [${conversation.mode}]`);

    for (const turn of conversation.turns) {
      console.log(`\nUSER: ${turn.content}`);

      for (const response of turn.responses) {
        console.log(`\n${response.modelId.toUpperCase()}:`);
        console.log(response.content || `[${response.status}]`);
      }
    }
  }

  console.log("\n===== END MESH HISTORY =====");
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

    const conversations = repair(
      data.conversations.filter((conversation) => !oldSeededIds.has(conversation.id)),
    );

    useMesh.setState({
      activeId:
        data.activeId && conversations.some((conversation) => conversation.id === data.activeId)
          ? data.activeId
          : null,
      conversations,
      draft: data.draft ?? "",
      draftModels: knownIds(data.draftModels, DEFAULT_MODELS),
      draftMode: data.draftMode ?? "balanced",
      defaultModelIds: knownIds(data.defaultModelIds, DEFAULT_MODELS),
      defaultMode: data.defaultMode ?? "balanced",
      theme: data.theme === "light" ? "light" : "dark",
      density: data.density === "compact" ? "compact" : "comfortable",
      fontScale: data.fontScale ?? "md",
      enterToSend: data.enterToSend !== false,
      showTimestamps: data.showTimestamps !== false,
      profile: data.profile ?? initial().profile,
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
    const provider = providerById(id);
    if (!provider) return;

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
      const file = files.find((candidate) => candidate.name === item.name && candidate.size === item.size);
      if (!file) continue;
      void Promise.all([
        rememberAttachment(item.id, file),
        uploadCloudFile(file, "attachment"),
      ])
        .then(([, uploaded]) => {
          if (!uploaded) throw new Error("Cloud upload failed");

          useMesh.setState((state) => ({
            pending: state.pending.map((p) =>
              p.id === item.id
                ? {
                    ...p,
                    status: "ready",
                    url: uploaded.url,
                    cloudinaryPublicId: uploaded.publicId,
                    resourceType: uploaded.resourceType,
                  }
                : p,
            ),
          }));
        })
        .catch(() => {
          forgetThumb(item.id);
          useMesh.setState((state) => ({
            pending: state.pending.map((p) =>
              p.id === item.id
                ? { ...p, status: "failed", error: "Could not upload this file." }
                : p,
            ),
          }));
        });
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
      const removed = s.conversations.find((c) => c.id === id);
      forgetConversationFiles(removed);
      if (s.activeId === id) {
        for (const file of s.pending) forgetThumb(file.id);
      }
      const conversations = s.conversations.filter((c) => c.id !== id);
      const deletingActive = s.activeId === id;
      return {
        conversations,
        activeId: deletingActive ? null : s.activeId,
        draft: deletingActive ? "" : s.draft,
        pending: deletingActive ? [] : s.pending,
        draftModels: deletingActive ? [...s.defaultModelIds] : s.draftModels,
        draftMode: deletingActive ? s.defaultMode : s.draftMode,
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
    const models = participantIds(s).filter((id) => providerById(id));
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
  setDefaultMode(defaultMode: WorkMode) {
    useMesh.setState({ defaultMode });
  },
  updateProfile(patch: Partial<Profile>) {
    useMesh.setState((s) => {
      const profile = { ...s.profile, ...patch };
      void saveCloudProfile({
        name: profile.name,
        email: profile.email,
        ...(profile.avatar ? { avatar: profile.avatar } : {}),
      });
      return { profile };
    });
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
    const conversations = useMesh.getState().conversations;
    for (const conversation of conversations) forgetConversationFiles(conversation);
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

export function providerReady(id: string, _s: MeshState) {
  const def = providerById(id);

  if (!def) {
    return {
      ok: false as const,
      errorKind: "failed" as const,
      error: "Unknown model.",
    };
  }

  return { ok: true as const };
}
