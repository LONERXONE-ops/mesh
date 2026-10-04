import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Database,
  KeyRound,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sun,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { uploadCloudFile } from "@/lib/mesh/cloud-storage";
import { toast } from "sonner";
import * as Switch from "@radix-ui/react-switch";
import { BYOK, BUILTIN, MODE_META, PROVIDERS } from "@/lib/mesh/catalog";
import { meshActions, useMesh } from "@/lib/mesh/store";
import type { SettingsDetail, WorkMode } from "@/lib/mesh/types";
import { cn } from "@/lib/cn";
import { Field, focusRing, inputClass } from "./bits";
import { signOut } from "@/lib/auth/client";

const GROUPS: {
  id: string;
  title: string;
  text: string;
  icon: typeof User;
  rows: { id: SettingsDetail; title: string; text: string; icon: typeof User }[];
}[] = [
  {
    id: "account",
    title: "Account",
    text: "Your personal information and account security.",
    icon: User,
    rows: [
      { id: "profile", title: "Profile", text: "Update your name and profile picture", icon: User },
      { id: "email", title: "Email", text: "Manage your email address", icon: Mail },
      { id: "password", title: "Password / security", text: "Change your password and security settings", icon: Lock },
    ],
  },
  {
    id: "appearance",
    title: "Appearance",
    text: "Customize how Mesh looks and feels.",
    icon: Sun,
    rows: [
      { id: "theme", title: "Theme", text: "Choose between light and dark mode", icon: Moon },
      { id: "chat-appearance", title: "Chat appearance", text: "Adjust message layout, font size and density", icon: MessageSquare },
    ],
  },
  {
    id: "ai",
    title: "AI providers",
    text: "Built-in Mesh access and your own API keys. Mesh never swaps a selected model.",
    icon: Sparkles,
    rows: [
      { id: "providers", title: "Built-in status", text: "Gemini, Groq, Dahl, Cloudflare, OpenRouter, Cohere", icon: Sparkles },
      { id: "api-keys", title: "BYOK connections", text: "Claude, DeepSeek, Grok, and Kimi use your key", icon: KeyRound },
      { id: "default-models", title: "Default models", text: "Set your preferred models", icon: Sparkles },
      { id: "default-mode", title: "Default chat mode", text: "Choose your default conversation mode", icon: SlidersHorizontal },
    ],
  },
  {
    id: "chat",
    title: "Workspace",
    text: "Default models, conversation preferences, and history.",
    icon: MessageSquare,
    rows: [
      { id: "preferences", title: "Conversation preferences", text: "Customize your chat experience", icon: MessageSquare },
      { id: "history", title: "History", text: "Manage your conversation history", icon: MessageSquare },
    ],
  },
  {
    id: "privacy",
    title: "Storage",
    text: "Cloud sync and attachment data stay on your account.",
    icon: Shield,
    rows: [{ id: "data", title: "Data controls", text: "Manage how your data is used", icon: Database }],
  },
  {
    id: "notes",
    title: "Notifications",
    text: "Choose what you want to be notified about.",
    icon: Bell,
    rows: [{ id: "notifications", title: "Notification preferences", text: "Manage your notification settings", icon: Bell }],
  },
];

export function SettingsView() {
  const detail = useMesh((s) => s.detail);
  const [groupId, setGroupId] = useState(GROUPS[0].id);
  const activeGroup = GROUPS.find((group) => group.rows.some((row) => row.id === detail)) ?? GROUPS.find((group) => group.id === groupId) ?? GROUPS[0];

  function openGroup(id: string) {
    setGroupId(id);
    meshActions.setDetail(null);
  }

  return (
    <section className="flex h-full min-h-0 flex-1 overflow-hidden">
      <nav className="hidden w-44 shrink-0 flex-col border-r border-line bg-bg p-3 sm:flex">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Settings</p>
          <button type="button" className={cn("grid size-8 place-items-center rounded-full text-muted", focusRing)} aria-label="Close settings" onClick={() => meshActions.setView("chat")}>
            <X className="size-4" />
          </button>
        </div>
        {GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => openGroup(group.id)}
            className={cn(
              "mb-1 h-9 rounded-lg px-2 text-left text-sm",
              focusRing,
              activeGroup.id === group.id ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
            )}
          >
            {group.title}
          </button>
        ))}
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-line px-3 py-2 pt-safe">
          <button type="button" className={cn("grid size-9 place-items-center rounded-full text-muted sm:hidden", focusRing)} aria-label="Close settings" onClick={() => meshActions.setView("chat")}>
            <X className="size-4" />
          </button>
          <h1 className="text-sm font-medium">{detail ? titleFor(detail) : activeGroup.title}</h1>
        </header>
        <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 sm:hidden">
          {GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => openGroup(group.id)}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3 text-xs",
                focusRing,
                activeGroup.id === group.id ? "border-fg bg-fg text-inverse-fg" : "border-line text-muted",
              )}
            >
              {group.title}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {detail ? <Detail id={detail} /> : <Overview group={activeGroup} />}
        </div>
      </div>
    </section>
  );
}

function titleFor(id: SettingsDetail) {
  for (const group of GROUPS) {
    const row = group.rows.find((r) => r.id === id);
    if (row) return row.title;
  }
  return "Settings";
}

function Overview({ group }: { group: (typeof GROUPS)[number] }) {
  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-3 text-sm text-muted">{group.text}</p>
      <div className="overflow-hidden rounded-xl border border-line">
        {group.rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => meshActions.setDetail(row.id)}
            className={cn("flex h-12 w-full items-center gap-2 border-b border-line px-3 text-left text-sm last:border-b-0 hover:bg-surface", focusRing)}
          >
            <span className="min-w-0 flex-1 truncate">{row.title}</span>
            <ChevronRight className="size-4 text-faint" aria-hidden />
          </button>
        ))}
      </div>
      {group.id === "account" ? (
        <button
          type="button"
          onClick={() => {
            void signOut("/login").catch(() => toast.error("Could not sign out"));
          }}
          className={cn("mt-4 h-9 rounded-full border border-line px-3 text-sm text-muted", focusRing)}
        >
          Sign out
        </button>
      ) : null}
    </div>
  );
}

function Detail({ id }: { id: SettingsDetail }) {
  return (
    <div className="mx-auto max-w-xl py-4">
      <button
        type="button"
        onClick={() => meshActions.setDetail(null)}
        className={cn("mb-4 hidden h-11 items-center gap-1 text-sm text-muted hover:text-fg lg:inline-flex", focusRing)}
      >
        <ChevronLeft className="size-4" /> All settings
      </button>
      {id === "profile" ? <ProfileForm /> : null}
      {id === "email" ? <EmailForm /> : null}
      {id === "password" ? <PasswordForm /> : null}
      {id === "theme" ? <ThemeForm /> : null}
      {id === "chat-appearance" ? <AppearanceForm /> : null}
      {id === "providers" ? <ProvidersForm /> : null}
      {id === "api-keys" ? <KeysForm /> : null}
      {id === "default-models" ? <DefaultsForm /> : null}
      {id === "default-mode" ? <ModeForm /> : null}
      {id === "preferences" ? <PrefsForm /> : null}
      {id === "history" ? <HistoryForm /> : null}
      {id === "data" ? <DataForm /> : null}
      {id === "notifications" ? <NotifyForm /> : null}
    </div>
  );
}

function ProfileForm() {
  const profile = useMesh((s) => s.profile);
  const [name, setName] = useState(profile.name);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const next = name.trim();
        if (!next) return;
        meshActions.updateProfile({ name: next });
        toast("Profile updated");
      }}
    >
      <div className="flex items-center gap-4">
        <span className="grid size-16 place-items-center overflow-hidden rounded-full bg-surface-2 text-xl font-medium">
          {profile.avatar ? <img src={profile.avatar} alt="" className="size-full object-cover" /> : profile.name.slice(0, 1)}
        </span>
        <label className={cn("inline-flex h-11 items-center rounded-full border border-line px-4 text-sm", focusRing)}>
          Change picture
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement("canvas");
                  const size = 128;
                  canvas.width = size;
                  canvas.height = size;
                  const ctx = canvas.getContext("2d");
                  if (!ctx) return;

                  const scale = Math.max(size / img.width, size / img.height);
                  const w = img.width * scale;
                  const h = img.height * scale;
                  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

                  canvas.toBlob(async (blob) => {
                    if (!blob) {
                      toast.error("Could not prepare picture");
                      return;
                    }

                    const uploaded = await uploadCloudFile(
                      new File([blob], "avatar.jpg", { type: "image/jpeg" }),
                      "avatar",
                    );

                    if (!uploaded) {
                      toast.error("Could not upload picture");
                      return;
                    }

                    meshActions.updateProfile({ avatar: uploaded.url, avatarPublicId: uploaded.publicId });
                    toast("Picture updated");
                  }, "image/jpeg", 0.85);
                };
                img.src = String(reader.result);
              };
              reader.readAsDataURL(file);
            }}
          />
        </label>
      </div>
      <Field label="Name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Field>
      <button type="submit" className={cn("h-11 rounded-full bg-inverse px-5 text-sm font-medium text-inverse-fg", focusRing)}>
        Save
      </button>
    </form>
  );
}

function EmailForm() {
  const email = useMesh((s) => s.profile.email);
  const [value, setValue] = useState(email);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          toast("Enter a valid email");
          return;
        }
        meshActions.updateProfile({ email: value.trim() });
        toast("Email updated on this device");
      }}
    >
      <Field label="Email" hint="Mail delivery is not connected yet. This address stays in the browser.">
        <input className={inputClass} type="email" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="email" />
      </Field>
      <button type="submit" className={cn("h-11 rounded-full bg-inverse px-5 text-sm font-medium text-inverse-fg", focusRing)}>
        Save
      </button>
    </form>
  );
}

function PasswordForm() {
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (next.length < 8) {
          toast("Use at least 8 characters");
          return;
        }
        if (next !== confirm) {
          toast("Those passwords do not match");
          return;
        }
        setNext("");
        setConfirm("");
        toast("Password was not stored. Accounts connect later.");
      }}
    >
      <p className="text-sm text-muted">
        Mesh does not keep passwords in the browser. This check only confirms the fields match. Real sign-in is not part of this build.
      </p>
      <Field label="New password">
        <input className={inputClass} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      </Field>
      <Field label="Confirm password">
        <input className={inputClass} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </Field>
      <button type="submit" className={cn("h-11 rounded-full bg-inverse px-5 text-sm font-medium text-inverse-fg", focusRing)}>
        Check password
      </button>
    </form>
  );
}

function ThemeForm() {
  const theme = useMesh((s) => s.theme);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(
        [
          ["dark", "Dark", "Black surfaces, white type"],
          ["light", "Light", "Cream surfaces, black type"],
        ] as const
      ).map(([id, label, text]) => (
        <button
          key={id}
          type="button"
          onClick={() => meshActions.setTheme(id)}
          className={cn(
            "rounded-2xl border p-4 text-left",
            focusRing,
            theme === id ? "border-fg" : "border-line",
          )}
          aria-pressed={theme === id}
        >
          <span className="block text-sm font-medium">{label}</span>
          <span className="mt-1 block text-xs text-muted">{text}</span>
        </button>
      ))}
    </div>
  );
}

function AppearanceForm() {
  const fontScale = useMesh((s) => s.fontScale);
  const density = useMesh((s) => s.density);
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Font size</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["sm", "Small"],
              ["md", "Medium"],
              ["lg", "Large"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={fontScale === id}
              onClick={() => meshActions.setFontScale(id)}
              className={cn("h-11 rounded-full border px-4 text-sm", focusRing, fontScale === id ? "border-fg bg-surface-2" : "border-line")}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Density</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["comfortable", "Comfortable"],
              ["compact", "Compact"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={density === id}
              onClick={() => meshActions.setDensity(id)}
              className={cn("h-11 rounded-full border px-4 text-sm", focusRing, density === id ? "border-fg bg-surface-2" : "border-line")}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function Toggle({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className="relative h-7 w-12 shrink-0 rounded-full bg-surface-2 data-[state=checked]:bg-inverse"
    >
      <Switch.Thumb className="block size-5 translate-x-1 rounded-full bg-muted transition data-[state=checked]:translate-x-6 data-[state=checked]:bg-inverse-fg" />
    </Switch.Root>
  );
}

function ProvidersForm() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Mesh uses the provider configuration available on its server. Provider
        availability cannot be manually faked from this device.
      </p>
      <ul className="overflow-hidden rounded-2xl border border-line">
        {PROVIDERS.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{p.name}</span>
              <span className="block text-xs text-faint">
                {p.kind === "builtin"
                  ? "Server configured"
                  : "Personal API key"}
              </span>
            </span>
            <span className="text-xs text-muted">
              {p.kind === "builtin" ? "Server" : "BYOK"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KeysForm() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/provider-keys")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load provider connections.");
        return (await response.json()) as {
          ok?: boolean;
          providers?: Array<{ providerId: string; connected: boolean }>;
        };
      })
      .then((data) => {
        if (cancelled) return;
        const next: Record<string, boolean> = {};
        for (const provider of data.providers ?? []) {
          next[provider.providerId] = provider.connected;
        }
        setConnected(next);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load API key connections.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveKey(providerId: string) {
    const key = keys[providerId]?.trim();

    if (!key) {
      toast.error("Enter an API key first.");
      return;
    }

    setSaving(providerId);

    try {
      const response = await fetch("/api/provider-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, key }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save API key.");
      }

      setConnected((current) => ({
        ...current,
        [providerId]: true,
      }));

      setKeys((current) => ({
        ...current,
        [providerId]: "",
      }));

      toast.success("API key connected.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save API key.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function removeKey(providerId: string) {
    setSaving(providerId);

    try {
      const response = await fetch("/api/provider-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to remove API key.");
      }

      setConnected((current) => ({
        ...current,
        [providerId]: false,
      }));

      toast.success("API key removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove API key.",
      );
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">Loading provider connections...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Your API keys</h3>
        <p className="mt-1 text-sm text-muted">
          Connect your own API keys for providers that require them.
          Keys are stored securely on the Mesh server and are never shown
          again after saving.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line">
        {BYOK.map((provider) => {
          const isConnected = connected[provider.id] === true;
          const isSaving = saving === provider.id;

          return (
            <div
              key={provider.id}
              className="border-b border-line p-4 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    isConnected ? "bg-emerald-500" : "bg-neutral-400",
                  )}
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{provider.name}</p>
                  <p className="text-xs text-faint">
                    {isConnected ? "Connected" : "API key required"}
                  </p>
                </div>

                {isConnected ? (
                  <button
                    type="button"
                    onClick={() => removeKey(provider.id)}
                    disabled={isSaving}
                    className="rounded-xl border border-line px-3 py-2 text-xs font-medium transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Removing..." : "Remove"}
                  </button>
                ) : null}
              </div>

              {!isConnected ? (
                <div className="mt-3 flex gap-2">
                  <input
                    type="password"
                    value={keys[provider.id] ?? ""}
                    onChange={(event) =>
                      setKeys((current) => ({
                        ...current,
                        [provider.id]: event.target.value,
                      }))
                    }
                    placeholder={`${provider.name} API key`}
                    autoComplete="off"
                    spellCheck={false}
                    className={cn(inputClass, "min-w-0 flex-1")}
                  />

                  <button
                    type="button"
                    onClick={() => saveKey(provider.id)}
                    disabled={isSaving || !(keys[provider.id]?.trim())}
                    className="shrink-0 rounded-xl bg-foreground px-4 py-2 text-xs font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Connect"}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-line p-4">
        <p className="text-xs text-muted">
          Built-in providers do not require your personal API key.
        </p>
        <p className="mt-1 text-xs text-faint">
          Available built-in providers:{" "}
          {BUILTIN.map((provider) => provider.name).join(", ")}.
        </p>
      </div>
    </div>
  );
}

function DefaultsForm() {
  const ids = useMesh((s) => s.defaultModelIds);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">New conversations start with these models. You can still change them in the composer.</p>
      <p className="text-sm">{ids.length ? ids.map((id) => PROVIDERS.find((p) => p.id === id)?.name ?? id).join(", ") : "None selected"}</p>
      <button type="button" className={cn("h-11 rounded-full bg-inverse px-5 text-sm font-medium text-inverse-fg", focusRing)} onClick={() => meshActions.openPicker("defaults")}>
        Choose default models
      </button>
    </div>
  );
}

function ModeForm() {
  const mode = useMesh((s) => s.defaultMode);
  return (
    <div className="space-y-2">
      {(Object.keys(MODE_META) as WorkMode[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => meshActions.setDefaultMode(key)}
          aria-pressed={mode === key}
          className={cn("w-full rounded-2xl border px-4 py-3 text-left", focusRing, mode === key ? "border-fg" : "border-line")}
        >
          <span className="block text-sm font-medium">{MODE_META[key].label}</span>
          <span className="mt-1 block text-xs text-muted">{MODE_META[key].hint}</span>
        </button>
      ))}
    </div>
  );
}

function PrefsForm() {
  const enterToSend = useMesh((s) => s.enterToSend);
  const showTimestamps = useMesh((s) => s.showTimestamps);
  return (
    <ul className="overflow-hidden rounded-2xl border border-line">
      <li className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex-1 text-sm">Enter sends the message</span>
        <Toggle label="Enter to send" checked={enterToSend} onCheckedChange={meshActions.setEnterToSend} />
      </li>
      <li className="flex items-center gap-3 px-4 py-3">
        <span className="flex-1 text-sm">Show timestamps</span>
        <Toggle label="Show timestamps" checked={showTimestamps} onCheckedChange={meshActions.setShowTimestamps} />
      </li>
    </ul>
  );
}

function HistoryForm() {
  const count = useMesh((s) => s.conversations.length);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{count} {count === 1 ? "conversation" : "conversations"} stored in this browser.</p>
      <button
        type="button"
        className={cn("h-11 rounded-full border border-danger/40 px-4 text-sm text-danger", focusRing)}
        onClick={() => {
          meshActions.clearHistory();
          toast("History cleared");
        }}
      >
        Clear history
      </button>
    </div>
  );
}

function DataForm() {
  const conversations = useMesh((s) => s.conversations);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Conversations and local preferences stay in this browser. API keys are not stored in local browser data.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn("h-11 rounded-full bg-inverse px-4 text-sm font-medium text-inverse-fg", focusRing)}
          onClick={() => {
            const blob = new Blob([JSON.stringify({ conversations }, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "mesh-conversations.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export conversations
        </button>
        <button
          type="button"
          className={cn("h-11 rounded-full border border-line px-4 text-sm", focusRing)}
          onClick={() => {
            meshActions.resetLocal();
            toast("Local data reset");
          }}
        >
          Reset local data
        </button>
      </div>
    </div>
  );
}

function NotifyForm() {
  const responses = useMesh((s) => s.notifyResponses);
  const errors = useMesh((s) => s.notifyErrors);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">These preferences are saved here. Push notifications are not connected.</p>
      <ul className="overflow-hidden rounded-2xl border border-line">
        <li className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="flex-1 text-sm">When replies finish</span>
          <Toggle label="Reply notifications" checked={responses} onCheckedChange={(v) => meshActions.setNotify("responses", v)} />
        </li>
        <li className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-sm">When a model fails</span>
          <Toggle label="Error notifications" checked={errors} onCheckedChange={(v) => meshActions.setNotify("errors", v)} />
        </li>
      </ul>
    </div>
  );
}
