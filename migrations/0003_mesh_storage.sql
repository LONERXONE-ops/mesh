CREATE TABLE IF NOT EXISTS mesh_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  mode TEXT NOT NULL,
  model_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  saved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS mesh_conversations_user_idx
  ON mesh_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS mesh_turns (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES mesh_conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  time_label TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS mesh_turns_conversation_idx
  ON mesh_turns(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS mesh_responses (
  id TEXT PRIMARY KEY,
  turn_id TEXT NOT NULL REFERENCES mesh_turns(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  status TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  error_kind TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS mesh_responses_turn_idx
  ON mesh_responses(turn_id);

CREATE TABLE IF NOT EXISTS mesh_attachments (
  id TEXT PRIMARY KEY,
  turn_id TEXT NOT NULL REFERENCES mesh_turns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size BIGINT NOT NULL,
  status TEXT NOT NULL,
  url TEXT,
  cloudinary_public_id TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS mesh_attachments_turn_idx
  ON mesh_attachments(turn_id);

CREATE TABLE IF NOT EXISTS mesh_profiles (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'You',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  updated_at BIGINT NOT NULL
);
