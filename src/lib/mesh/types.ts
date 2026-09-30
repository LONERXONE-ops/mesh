export type WorkMode = "balanced" | "independent" | "collaborative";

export type ProviderKind = "builtin" | "byok";

export type ResponseStatus = "waiting" | "thinking" | "streaming" | "completed" | "error";

export type ErrorKind = "unavailable" | "not_connected" | "failed" | "stopped";

export type AttachmentStatus = "uploading" | "ready" | "failed";

export type AppView = "chat" | "history" | "saved" | "settings";

export type SettingsDetail =
  | "profile"
  | "email"
  | "password"
  | "theme"
  | "chat-appearance"
  | "providers"
  | "api-keys"
  | "default-models"
  | "default-mode"
  | "preferences"
  | "history"
  | "data"
  | "notifications";

export type PickerTarget = "participants" | "defaults";

export type FontScale = "sm" | "md" | "lg";

export type Density = "comfortable" | "compact";

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  status: AttachmentStatus;
  error?: string;
}

export interface ModelResponse {
  id: string;
  modelId: string;
  status: ResponseStatus;
  content: string;
  errorKind?: ErrorKind;
  error?: string;
}

export interface Turn {
  id: string;
  content: string;
  attachments: Attachment[];
  createdAt: number;
  timeLabel: string;
  responses: ModelResponse[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: WorkMode;
  modelIds: string[];
  saved: boolean;
  turns: Turn[];
}

export interface Connection {
  connected: boolean;
  hint: string;
}

export interface Profile {
  name: string;
  email: string;
  avatar?: string;
}

export interface ProviderDef {
  id: string;
  name: string;
  kind: ProviderKind;
  blurb: string;
}
