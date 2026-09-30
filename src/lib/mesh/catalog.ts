import type { ProviderDef, WorkMode } from "./types";

export const PROVIDERS: ProviderDef[] = [
  { id: "gemini", name: "Gemini", kind: "builtin", blurb: "Built-in" },
  { id: "groq", name: "Groq", kind: "builtin", blurb: "Built-in" },
  { id: "dahl", name: "Dahl", kind: "builtin", blurb: "Built-in" },
  { id: "cloudflare", name: "Cloudflare", kind: "builtin", blurb: "Built-in" },
  { id: "openrouter", name: "OpenRouter", kind: "builtin", blurb: "Built-in" },
  { id: "cohere", name: "Cohere", kind: "builtin", blurb: "Built-in" },
  { id: "claude", name: "Claude", kind: "byok", blurb: "My API" },
  { id: "deepseek", name: "DeepSeek", kind: "byok", blurb: "My API" },
  { id: "grok", name: "Grok", kind: "byok", blurb: "My API" },
  { id: "kimi", name: "Kimi", kind: "byok", blurb: "My API" },
];

export const BUILTIN = PROVIDERS.filter((p) => p.kind === "builtin");
export const BYOK = PROVIDERS.filter((p) => p.kind === "byok");

export const MODE_META: Record<WorkMode, { label: string; hint: string; subtitle: string }> = {
  balanced: {
    label: "Balanced",
    hint: "One shared conversation. Each model answers your latest message.",
    subtitle: "1 conversation",
  },
  independent: {
    label: "Independent",
    hint: "Each model works alone and only sees its own earlier replies.",
    subtitle: "Independent mode",
  },
  collaborative: {
    label: "Collaborative",
    hint: "Models answer in order and can use what the others just said.",
    subtitle: "Collaborative",
  },
};

export function providerById(id: string) {
  return PROVIDERS.find((p) => p.id === id);
}

export function defaultAvailability(): Record<string, boolean> {
  return Object.fromEntries(PROVIDERS.map((p) => [p.id, p.id !== "kimi"]));
}

export function defaultConnections(): Record<string, { connected: boolean; hint: string }> {
  return {
    claude: { connected: false, hint: "" },
    deepseek: { connected: false, hint: "" },
    grok: { connected: false, hint: "" },
    kimi: { connected: false, hint: "" },
  };
}
