ALTER TABLE mesh_profiles
  ADD COLUMN IF NOT EXISTS avatar_public_id TEXT;
