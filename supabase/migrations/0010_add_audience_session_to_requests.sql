alter table public.requests
  add column if not exists audience_session_id text;

create index if not exists requests_event_audience_session_created_at_idx
  on public.requests (event_id, audience_session_id, created_at desc)
  where audience_session_id is not null;

create index if not exists requests_event_status_created_at_idx
  on public.requests (event_id, status, created_at desc);
