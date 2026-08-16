create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  name text not null,
  slug text not null unique,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  is_active boolean not null default true,
  constraint events_name_not_blank check (length(trim(name)) > 0),
  constraint events_slug_not_blank check (length(trim(slug)) > 0),
  constraint events_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.djs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  constraint djs_name_not_blank check (length(trim(name)) > 0)
);

create index if not exists djs_event_active_sort_idx
  on public.djs (event_id, is_active, sort_order, created_at);

alter table public.requests
  add column if not exists event_id uuid references public.events(id) on delete set null,
  add column if not exists dj_id uuid references public.djs(id) on delete set null;

create index if not exists requests_event_dj_status_created_at_idx
  on public.requests (event_id, dj_id, status, created_at desc);

do $$
declare
  default_event_id uuid;
  koike_id uuid;
  taiyo_id uuid;
  guest_id uuid;
begin
  insert into public.events (name, slug, is_active)
  values ('FloorVibes Night', 'floorvibes', true)
  on conflict (slug) do update
    set name = excluded.name,
        is_active = true
  returning id into default_event_id;

  insert into public.djs (event_id, name, sort_order, is_active)
  select default_event_id, 'DJ Koike', 0, true
  where not exists (
    select 1 from public.djs where event_id = default_event_id and name = 'DJ Koike'
  )
  returning id into koike_id;

  select id into koike_id
  from public.djs
  where event_id = default_event_id and name = 'DJ Koike'
  limit 1;

  insert into public.djs (event_id, name, sort_order, is_active)
  select default_event_id, 'DJ Taiyo', 1, true
  where not exists (
    select 1 from public.djs where event_id = default_event_id and name = 'DJ Taiyo'
  )
  returning id into taiyo_id;

  select id into taiyo_id
  from public.djs
  where event_id = default_event_id and name = 'DJ Taiyo'
  limit 1;

  insert into public.djs (event_id, name, sort_order, is_active)
  select default_event_id, 'Guest DJ', 2, true
  where not exists (
    select 1 from public.djs where event_id = default_event_id and name = 'Guest DJ'
  )
  returning id into guest_id;

  select id into guest_id
  from public.djs
  where event_id = default_event_id and name = 'Guest DJ'
  limit 1;

  update public.requests
  set event_id = default_event_id,
      dj_id = case
        when dj_name = 'DJ Koike' then koike_id
        when dj_name = 'DJ Taiyo' then taiyo_id
        when dj_name = 'Guest DJ' then guest_id
        else dj_id
      end
  where event_id is null;
end $$;

alter table public.events enable row level security;
alter table public.djs enable row level security;

grant select, insert, update on public.events to anon;
grant select, insert, update on public.events to authenticated;
grant select, insert, update on public.djs to anon;
grant select, insert, update on public.djs to authenticated;

drop policy if exists "Anyone can read active events" on public.events;
create policy "Anyone can read active events"
  on public.events
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Anyone can manage events for MVP" on public.events;
create policy "Anyone can manage events for MVP"
  on public.events
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Anyone can read DJs" on public.djs;
create policy "Anyone can read DJs"
  on public.djs
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can manage DJs for MVP" on public.djs;
create policy "Anyone can manage DJs for MVP"
  on public.djs
  for all
  to anon, authenticated
  using (true)
  with check (true);

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
        and tablename = 'djs'
    ) then
      alter publication supabase_realtime add table public.djs;
    end if;
  end if;
end $$;
