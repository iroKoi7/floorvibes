create table if not exists public.dj_timeline_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  dj_id uuid not null references public.djs(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  sort_order integer not null default 0,
  constraint dj_timeline_slots_time_check check (ends_at > starts_at)
);

create index if not exists dj_timeline_slots_event_time_idx
  on public.dj_timeline_slots (event_id, starts_at, ends_at, sort_order);

alter table public.dj_timeline_slots enable row level security;

grant select on public.dj_timeline_slots to anon;
grant select, insert, update, delete on public.dj_timeline_slots to authenticated;

drop policy if exists "Anyone can read timeline slots for active events" on public.dj_timeline_slots;
create policy "Anyone can read timeline slots for active events"
  on public.dj_timeline_slots
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.events
      where events.id = dj_timeline_slots.event_id
        and events.is_active = true
    )
  );

drop policy if exists "Admin can manage timeline slots for manageable events" on public.dj_timeline_slots;
create policy "Admin can manage timeline slots for manageable events"
  on public.dj_timeline_slots
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.events
      where events.id = dj_timeline_slots.event_id
        and (
          events.owner_id is null
          or events.owner_id = (select auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1
      from public.events
      where events.id = dj_timeline_slots.event_id
        and (
          events.owner_id is null
          or events.owner_id = (select auth.uid())
        )
    )
  );
