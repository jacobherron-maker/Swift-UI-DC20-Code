create table if not exists public.hub_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.hub_state enable row level security;

revoke all on table public.hub_state from anon, authenticated;
grant select, insert, update on table public.hub_state to authenticated;

drop policy if exists "Users can read their own hub" on public.hub_state;
create policy "Users can read their own hub"
on public.hub_state
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can create their own hub" on public.hub_state;
create policy "Users can create their own hub"
on public.hub_state
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update their own hub" on public.hub_state;
create policy "Users can update their own hub"
on public.hub_state
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
