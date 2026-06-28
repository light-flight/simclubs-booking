create table if not exists users (
  id bigserial primary key,
  telegram_user_id bigint not null unique,
  simclubs_email text,
  default_club_id text,
  timezone text not null default 'Europe/Moscow',
  auth_status text not null default 'unlinked',
  encrypted_storage_state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists booking_requests (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  raw_message text not null,
  parsed_intent jsonb,
  booking_plan jsonb,
  status text not null default 'created',
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pending_confirmations (
  id uuid primary key,
  user_id bigint not null references users(id) on delete cascade,
  booking_request_id bigint not null references booking_requests(id) on delete cascade,
  booking_plan jsonb not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists booking_attempts (
  id bigserial primary key,
  booking_request_id bigint not null references booking_requests(id) on delete cascade,
  executor_type text not null,
  status text not null,
  error_code text,
  error_message text,
  screenshot_path text,
  created_at timestamptz not null default now()
);

create index if not exists booking_requests_user_status_idx on booking_requests(user_id, status);
create index if not exists pending_confirmations_user_status_idx on pending_confirmations(user_id, status);
