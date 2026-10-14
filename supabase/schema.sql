-- Run in the dedicated Looplane Supabase project. Safe to apply again.
begin;

create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default pg_catalog.now(),
  constraint progress_data_v1 check (
    pg_catalog.jsonb_typeof(data) = 'object' and data ? 'version' and data ->> 'version' = '1'
  )
);

alter table public.progress enable row level security;

create or replace function public.set_progress_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_progress_updated_at() from public, anon, authenticated;
drop trigger if exists progress_updated_at on public.progress;
create trigger progress_updated_at
before update on public.progress
for each row execute function public.set_progress_updated_at();

drop policy if exists "Read own progress" on public.progress;
create policy "Read own progress" on public.progress for select
to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Insert own progress" on public.progress;
create policy "Insert own progress" on public.progress for insert
to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Update own progress" on public.progress;
create policy "Update own progress" on public.progress for update
to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.progress from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update on table public.progress to authenticated;

comment on table public.progress is 'Private versioned learning-progress snapshots; one row per signed-in user.';
commit;
