-- Per-user bento dashboard layout.
-- One row per user; layout is an ordered array of tile ids.

create table if not exists public.user_dashboard_layout (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  layout     jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_dashboard_layout enable row level security;

drop policy if exists "user_dashboard_layout_select_own"
  on public.user_dashboard_layout;
drop policy if exists "user_dashboard_layout_insert_own"
  on public.user_dashboard_layout;
drop policy if exists "user_dashboard_layout_update_own"
  on public.user_dashboard_layout;
drop policy if exists "user_dashboard_layout_delete_own"
  on public.user_dashboard_layout;

create policy "user_dashboard_layout_select_own"
  on public.user_dashboard_layout
  for select
  using (auth.uid() = user_id);

create policy "user_dashboard_layout_insert_own"
  on public.user_dashboard_layout
  for insert
  with check (auth.uid() = user_id);

create policy "user_dashboard_layout_update_own"
  on public.user_dashboard_layout
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_dashboard_layout_delete_own"
  on public.user_dashboard_layout
  for delete
  using (auth.uid() = user_id);

create or replace function public.user_dashboard_layout_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_dashboard_layout_touch
  on public.user_dashboard_layout;

create trigger trg_user_dashboard_layout_touch
  before update on public.user_dashboard_layout
  for each row
  execute function public.user_dashboard_layout_touch_updated_at();
