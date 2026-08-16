alter table public.events
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

create index if not exists events_owner_active_created_at_idx
  on public.events (owner_id, is_active, created_at desc);

drop policy if exists "Anyone can manage events for MVP" on public.events;
drop policy if exists "Anyone can manage DJs for MVP" on public.djs;
drop policy if exists "Anyone can delete DJs for MVP" on public.djs;
drop policy if exists "Anyone can read active DJs" on public.djs;
drop policy if exists "Admin can read manageable events" on public.events;
drop policy if exists "Admin can create own events" on public.events;
drop policy if exists "Admin can update own or legacy events" on public.events;
drop policy if exists "Admin can read manageable DJs" on public.djs;
drop policy if exists "Admin can create DJs for manageable events" on public.djs;
drop policy if exists "Admin can update DJs for manageable events" on public.djs;
drop policy if exists "Admin can delete DJs for manageable events" on public.djs;

revoke insert, update, delete on public.events from anon;
revoke insert, update, delete on public.djs from anon;

grant select on public.events to anon;
grant select, insert, update on public.events to authenticated;
grant select on public.djs to anon;
grant select, insert, update, delete on public.djs to authenticated;

create policy "Admin can read manageable events"
  on public.events
  for select
  to authenticated
  using (
    owner_id is null
    or owner_id = (select auth.uid())
  );

create policy "Admin can create own events"
  on public.events
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Admin can update own or legacy events"
  on public.events
  for update
  to authenticated
  using (
    owner_id is null
    or owner_id = (select auth.uid())
  )
  with check (
    owner_id is null
    or owner_id = (select auth.uid())
  );

drop policy if exists "Anyone can read DJs" on public.djs;
create policy "Anyone can read active DJs"
  on public.djs
  for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.events
      where events.id = djs.event_id
        and events.is_active = true
    )
  );

create policy "Admin can read manageable DJs"
  on public.djs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.events
      where events.id = djs.event_id
        and (
          events.owner_id is null
          or events.owner_id = (select auth.uid())
        )
    )
  );

create policy "Admin can create DJs for manageable events"
  on public.djs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.events
      where events.id = djs.event_id
        and (
          events.owner_id is null
          or events.owner_id = (select auth.uid())
        )
    )
  );

create policy "Admin can update DJs for manageable events"
  on public.djs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.events
      where events.id = djs.event_id
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
      where events.id = djs.event_id
        and (
          events.owner_id is null
          or events.owner_id = (select auth.uid())
        )
    )
  );

create policy "Admin can delete DJs for manageable events"
  on public.djs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.events
      where events.id = djs.event_id
        and (
          events.owner_id is null
          or events.owner_id = (select auth.uid())
        )
    )
  );
