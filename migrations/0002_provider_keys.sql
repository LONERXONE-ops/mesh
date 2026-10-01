create table if not exists user_provider_keys (
  user_id text not null references "user" ("id") on delete cascade,
  provider_id text not null,
  encrypted_key text not null,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  primary key (user_id, provider_id)
);

create index if not exists user_provider_keys_user_id_idx
  on user_provider_keys (user_id);
