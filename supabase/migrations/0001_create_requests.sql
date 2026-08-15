create extension if not exists pgcrypto;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  dj_name text not null,
  requested_by text,
  song_title text not null,
  status text not null default 'pending',
  constraint requests_status_check check (status in ('pending', 'played', 'dismissed')),
  constraint requests_song_title_not_blank check (length(trim(song_title)) > 0),
  constraint requests_dj_name_not_blank check (length(trim(dj_name)) > 0)
);

create index if not exists requests_dj_status_created_at_idx
  on public.requests (dj_name, status, created_at desc);

alter table public.requests enable row level security;

grant select, insert on public.requests to anon;
grant select, insert on public.requests to authenticated;

revoke update on public.requests from anon;
revoke update on public.requests from authenticated;

grant update (status) on public.requests to anon;
grant update (status) on public.requests to authenticated;

drop policy if exists "Anyone can submit song requests" on public.requests;
create policy "Anyone can submit song requests"
  on public.requests
  for insert
  to anon, authenticated
  with check (status = 'pending');

drop policy if exists "Anyone can read pending song requests" on public.requests;
drop policy if exists "Anyone can read song requests" on public.requests;
create policy "Anyone can read song requests"
  on public.requests
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can resolve pending song requests" on public.requests;
drop policy if exists "Anyone can update request status" on public.requests;
create policy "Anyone can update request status"
  on public.requests
  for update
  to anon, authenticated
  using (true)
  with check (status in ('pending', 'played', 'dismissed'));

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'requests'
    ) then
      alter publication supabase_realtime add table public.requests;
    end if;
  end if;
end $$;
