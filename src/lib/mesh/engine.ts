import { providerById } from "./catalog";
import { composePreview, type PeerNote } from "./preview";
import { meshActions, providerReady, useMesh } from "./store";

const tokens = new Map<string, number>();

function bump(id: string) {
  const next = (tokens.get(id) ?? 0) + 1;
  tokens.set(id, next);
  return next;
}

function alive(id: string, token: number) {
  return tokens.get(id) === token;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function stopConversation(convId: string) {
  const conv = useMesh.getState().conversations.find((c) => c.id === convId);
  if (!conv) return;
  for (const turn of conv.turns) {
    for (const response of turn.responses) {
      if (response.status === "waiting" || response.status === "thinking" || response.status === "streaming") {
        bump(response.id);
        meshActions.patchResponse(convId, turn.id, response.id, {
          status: response.content ? "completed" : "error",
          errorKind: response.content ? undefined : "stopped",
          error: response.content ? undefined : "Generation stopped.",
        });
      }
    }
  }
}

export async function runTurn(convId: string, turnId: string) {
  const state = useMesh.getState();
  const conv = state.conversations.find((c) => c.id === convId);
  const turn = conv?.turns.find((t) => t.id === turnId);
  if (!conv || !turn) return;

  if (conv.mode === "collaborative") {
    const peers: PeerNote[] = [];
    for (const response of turn.responses) {
      await runResponse(convId, turnId, response.id, peers);
      const latest = useMesh
        .getState()
        .conversations.find((c) => c.id === convId)
        ?.turns.find((t) => t.id === turnId)
        ?.responses.find((r) => r.id === response.id);
      if (latest?.content) {
        peers.push({
          name: providerById(response.modelId)?.name ?? response.modelId,
          excerpt: latest.content,
        });
      }
    }
    return;
  }

  await Promise.all(turn.responses.map((r) => runResponse(convId, turnId, r.id, [])));
}

export async function runResponse(convId: string, turnId: string, responseId: string, peers: PeerNote[]) {
  const token = bump(responseId);
  const read = () => {
    const conv = useMesh.getState().conversations.find((c) => c.id === convId);
    const turn = conv?.turns.find((t) => t.id === turnId);
    const response = turn?.responses.find((r) => r.id === responseId);
    return { conv, turn, response };
  };

  const first = read();
  if (!first.conv || !first.turn || !first.response) return;
  const modelId = first.response.modelId;
  const ready = providerReady(modelId, useMesh.getState());
  if (!ready.ok) {
    if (!alive(responseId, token)) return;
    meshActions.patchResponse(convId, turnId, responseId, {
      status: "error",
      errorKind: ready.errorKind,
      error: ready.error,
      content: "",
    });
    return;
  }

  meshActions.patchResponse(convId, turnId, responseId, {
    status: "thinking",
    content: "",
    error: undefined,
    errorKind: undefined,
  });
  const thinkFor = modelId === "groq" ? 280 : 520 + (modelId.length % 3) * 80;
  await sleep(thinkFor);
  if (!alive(responseId, token)) return;

  const snapshot = read();
  if (!snapshot.conv || !snapshot.turn) return;
  const ownHistory = snapshot.conv.turns
    .filter((t) => t.id !== turnId)
    .map((t) => t.content)
    .slice(-3);
  const full = composePreview({
    modelId,
    mode: snapshot.conv.mode,
    prompt: snapshot.turn.content,
    attachments: snapshot.turn.attachments.map((a) => ({ name: a.name })),
    ownHistory,
    peers,
  });

  meshActions.patchResponse(convId, turnId, responseId, { status: "streaming", content: "" });
  const size = modelId === "groq" ? 18 : 7;
  const gap = modelId === "groq" ? 16 : 28;
  let cursor = 0;
  while (cursor < full.length) {
    if (!alive(responseId, token)) return;
    cursor = Math.min(full.length, cursor + size);
    meshActions.patchResponse(convId, turnId, responseId, {
      status: "streaming",
      content: full.slice(0, cursor),
    });
    await sleep(gap);
  }
  if (!alive(responseId, token)) return;
  meshActions.patchResponse(convId, turnId, responseId, { status: "completed", content: full });
}
