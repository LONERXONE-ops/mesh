import type { Conversation } from "./types";

type StorageResponse =
  | { ok: true; conversations: Conversation[] }
  | { ok: true }
  | { ok: false; error: string };

async function request(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<StorageResponse> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json()) as StorageResponse;

  if (!response.ok || data.ok === false) {
    throw new Error(
      "error" in data ? data.error : `Storage request failed (${response.status})`,
    );
  }

  return data;
}

export async function loadCloudConversations(): Promise<Conversation[] | null> {
  try {
    const data = await request("/api/mesh-storage");

    if (!("conversations" in data)) return [];
    return data.conversations;
  } catch {
    return null;
  }
}

export async function saveCloudConversation(
  conversation: Conversation,
): Promise<boolean> {
  try {
    await request("/api/mesh-storage", {
      method: "PUT",
      body: JSON.stringify({ conversation }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteCloudConversation(id: string): Promise<boolean> {
  try {
    await request("/api/mesh-storage", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function migrateLocalConversations(
  conversations: Conversation[],
): Promise<boolean> {
  try {
    for (const conversation of conversations) {
      await saveCloudConversation(conversation);
    }
    return true;
  } catch {
    return false;
  }
}


export async function loadCloudProfile(): Promise<{
  name: string;
  email: string;
  avatar?: string;
} | null> {
  try {
    const response = await fetch("/api/mesh-profile");
    if (!response.ok) return null;

    const data = (await response.json()) as {
      ok?: boolean;
      profile?: {
        name: string;
        email: string;
        avatar?: string;
      } | null;
    };

    return data.ok ? data.profile ?? null : null;
  } catch {
    return null;
  }
}

export async function saveCloudProfile(profile: {
  name: string;
  email: string;
  avatar?: string;
}): Promise<boolean> {
  try {
    const response = await fetch("/api/mesh-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function uploadCloudFile(
  file: File,
  kind: "avatar" | "attachment",
): Promise<{
  url: string;
  publicId: string;
  resourceType: string;
} | null> {
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);

    const response = await fetch("/api/mesh-upload", {
      method: "POST",
      body: form,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      ok?: boolean;
      url?: string;
      publicId?: string;
      resourceType?: string;
    };

    if (!data.ok || !data.url || !data.publicId || !data.resourceType) {
      return null;
    }

    return {
      url: data.url,
      publicId: data.publicId,
      resourceType: data.resourceType,
    };
  } catch {
    return null;
  }
}
