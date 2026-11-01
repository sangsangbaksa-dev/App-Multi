-- Optional cloud backup/sync for QuickBill, Stampbook and Stayline.
-- One JSON snapshot per (user, app). Each user can only touch their own rows (Row Level Security).
-- The apps stay local-first: they work without this table and without signing in.

create table if not exists public.app_snapshots (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  app        text        not null check (app in ('quickbill', 'stampbook', 'stayline')),
  data       jsonb       not null check (octet_length(data::text) <= 5000000),
  revision   bigint      not null default 1,   -- bumped on every write; clients use it to detect conflicts
  device     text        check (device is null or char_length(device) <= 80),
  updated_at timestamptz not null default now(),
  primary key (user_id, app)
);

alter table public.app_snapshots enable row level security;
alter table public.app_snapshots force row level security;

create policy "own rows: select" on public.app_snapshots
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own rows: insert" on public.app_snapshots
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own rows: update" on public.app_snapshots
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows: delete" on public.app_snapshots
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Anonymous (not logged in) callers get nothing.
revoke all on public.app_snapshots from anon;
grant select, insert, update, delete on public.app_snapshots to authenticated;

create or replace function public.app_snapshots_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger app_snapshots_touch before update on public.app_snapshots
  for each row execute function public.app_snapshots_touch();
