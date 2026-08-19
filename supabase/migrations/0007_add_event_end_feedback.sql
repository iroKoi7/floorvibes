alter table public.events
  add column if not exists end_message text not null
    default 'This event has ended. Thanks for joining FloorVibes. Send some love to the DJs.';

create table if not exists public.event_likes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  event_id uuid not null references public.events(id) on delete cascade,
  dj_id uuid not null references public.djs(id) on delete cascade,
  audience_session_id text not null,
  audience_name text,
  constraint event_likes_session_not_blank check (length(trim(audience_session_id)) > 0),
  constraint event_likes_one_per_dj_session unique (event_id, dj_id, audience_session_id)
);

create index if not exists event_likes_event_dj_created_at_idx
  on public.event_likes (event_id, dj_id, created_at desc);

alter table public.event_likes enable row level security;

grant select, insert on public.event_likes to anon;
grant select, insert on public.event_likes to authenticated;

drop policy if exists "Anyone can read event likes" on public.event_likes;
drop policy if exists "Anyone can send event likes" on public.event_likes;

create policy "Anyone can read event likes"
  on public.event_likes
  for select
  to anon, authenticated
  using (true);

create policy "Anyone can send event likes"
  on public.event_likes
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.events
      where events.id = event_likes.event_id
        and events.is_active = true
    )
    and exists (
      select 1
      from public.djs
      where djs.id = event_likes.dj_id
        and djs.event_id = event_likes.event_id
        and djs.is_active = true
    )
  );

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
        and tablename = 'event_likes'
    ) then
      alter publication supabase_realtime add table public.event_likes;
    end if;
  end if;
end $$;
