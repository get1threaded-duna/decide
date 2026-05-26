-- USERS
create table users (
  id                 uuid primary key references auth.users on delete cascade,
  email              text unique not null,
  created_at         timestamptz default now(),
  plan               text default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text
);

-- PROFILES
create table profiles (
  user_id    uuid primary key references users on delete cascade,
  interests  jsonb default '{}'::jsonb,
  confidence jsonb default '{}'::jsonb
);

-- FEEDBACK_LOG
create table feedback_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users on delete cascade,
  item_id       text not null,
  action        text not null check (action in ('save', 'swap', 'ignore', 'open')),
  item_snapshot jsonb,
  ts            timestamptz default now()
);

-- SAVED_ITEMS
create table saved_items (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references users on delete cascade,
  item_id  text not null,
  category text not null,
  ts       timestamptz default now(),
  unique (user_id, item_id)
);

-- CONTEXTS_CACHE
create table contexts_cache (
  user_id       uuid references users on delete cascade,
  ctx_signature text not null,
  reason_text   text,
  generated_at  timestamptz default now(),
  primary key (user_id, ctx_signature)
);

create index on feedback_log (user_id, ts desc);
create index on saved_items  (user_id, ts desc);

alter table users          enable row level security;
alter table profiles       enable row level security;
alter table feedback_log   enable row level security;
alter table saved_items    enable row level security;
alter table contexts_cache enable row level security;

create policy "users: own row" on users
  for all using (id = auth.uid());

create policy "profiles: own row" on profiles
  for all using (user_id = auth.uid());

create policy "feedback_log: own rows" on feedback_log
  for all using (user_id = auth.uid());

create policy "saved_items: own rows" on saved_items
  for all using (user_id = auth.uid());

create policy "contexts_cache: own rows" on contexts_cache
  for all using (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $func$
begin
  insert into public.users (id, email)
    values (new.id, new.email);

  insert into public.profiles (user_id)
    values (new.id);

  return new;
end;
$func$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
