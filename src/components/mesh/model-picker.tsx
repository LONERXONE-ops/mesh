import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { BUILTIN, BYOK } from "@/lib/mesh/catalog";
import { meshActions, participantIds, useMesh } from "@/lib/mesh/store";
import type { ProviderDef } from "@/lib/mesh/types";
import { cn } from "@/lib/cn";
import { focusRing } from "./bits";
import { Wordmark } from "./logo";
import { ModelMark } from "./model-mark";

type KeyStatus = "idle" | "loading" | "ready" | "error";

function Row({
  provider,
  selected,
  status,
  disabled,
  onToggle,
}: {
  provider: ProviderDef;
  selected: boolean;
  status: string;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 border-b border-line px-3 py-2 text-left last:border-b-0",
        disabled ? "cursor-not-allowed opacity-60" : "hover:bg-surface-2/60",
        focusRing,
      )}
    >
      <ModelMark id={provider.id} />

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium">{provider.name}</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-faint">
            {provider.blurb}
          </span>
        </span>
      </span>

      <span
        className={cn(
          "hidden items-center gap-1.5 text-xs sm:flex",
          status === "Connected" || status === "Built-in" ? "text-ok" : "text-faint",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            status === "Connected" || status === "Built-in" ? "bg-ok" : "bg-faint",
          )}
          aria-hidden
        />
        {status}
      </span>

      <span
        className={cn(
          "grid size-5 place-items-center rounded-md border",
          selected ? "border-fg bg-fg text-inverse-fg" : "border-line-strong",
        )}
        aria-hidden
      >
        {selected ? (
          <svg viewBox="0 0 16 16" className="size-3.5">
            <path
              d="M3.5 8.2 6.4 11 12.5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

export function ModelPicker() {
  const open = useMesh((s) => s.pickerOpen);
  const target = useMesh((s) => s.pickerTarget);
  const defaults = useMesh((s) => s.defaultModelIds);
  const state = useMesh();
  const selected = target === "defaults" ? defaults : participantIds(state);
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [keyStatus, setKeyStatus] = useState<KeyStatus>("idle");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setKeyStatus("loading");
    fetch("/api/provider-keys", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<{
          providers?: Array<{ providerId: string; connected: boolean }>;
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        const next: Record<string, boolean> = {};
        for (const row of data.providers ?? []) next[row.providerId] = Boolean(row.connected);
        setConnected(next);
        setKeyStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setConnected({});
        setKeyStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && meshActions.closePicker(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-inverse/60" />

        <Dialog.Content
          className="mesh-pop fixed inset-0 z-50 flex flex-col bg-bg outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(860px,calc(100dvh-3rem))] sm:w-[min(640px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-line sm:shadow-pop"
          aria-describedby="model-picker-desc"
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-safe sm:pt-5">
            <div className="min-w-0">
              <Wordmark className="mb-3 sm:hidden [&_img]:h-6" />

              <Dialog.Title className="text-xl font-semibold">Choose models</Dialog.Title>

              <Dialog.Description id="model-picker-desc" className="mt-1 text-sm text-muted">
                Select the AI models you want to use {target === "defaults" ? "by default" : "in this conversation"}.
              </Dialog.Description>
            </div>

            <Dialog.Close
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-fg",
                focusRing,
              )}
              aria-label="Close"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
            <Section title="Built-in" count={BUILTIN.length}>
              {BUILTIN.map((provider) => (
                <Row
                  key={provider.id}
                  provider={provider}
                  selected={selected.includes(provider.id)}
                  status="Built-in"
                  disabled={false}
                  onToggle={() => meshActions.toggleListedModel(provider.id)}
                />
              ))}
            </Section>

            <Section title="My API" count={BYOK.length}>
              {BYOK.map((provider) => {
                const isConnected = keyStatus === "ready" && connected[provider.id] === true;
                const alreadySelected = selected.includes(provider.id);
                return (
                  <Row
                    key={provider.id}
                    provider={provider}
                    selected={alreadySelected}
                    status={byokStatus(keyStatus, isConnected)}
                    disabled={!isConnected && !alreadySelected}
                    onToggle={() => {
                      if (!isConnected && !alreadySelected) return;
                      meshActions.toggleListedModel(provider.id);
                    }}
                  />
                );
              })}
            </Section>

            <p className="mt-3 text-xs text-faint">
              Built-in models use Mesh access. My API models stay visible, but a disconnected key cannot be newly selected. Nothing here swaps in another model.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 pb-safe">
            <p className="text-sm text-muted">
              {selected.length} {selected.length === 1 ? "model" : "models"} selected
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={cn(
                  "hidden h-11 rounded-full px-4 text-sm text-muted hover:text-fg sm:inline-flex",
                  focusRing,
                )}
                onClick={() => meshActions.closePicker(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={cn(
                  "h-11 rounded-full bg-inverse px-5 text-sm font-medium text-inverse-fg",
                  focusRing,
                )}
                onClick={() => meshActions.closePicker(true)}
              >
                Done
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function byokStatus(status: KeyStatus, connected: boolean) {
  if (status === "loading" || status === "idle") return "Checking";
  if (status === "error") return "Not connected";
  return connected ? "Connected" : "Not connected";
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-faint">{count} models</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-bg">{children}</div>
    </section>
  );
}
