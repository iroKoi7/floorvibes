alter table public.djs
  add column if not exists accepts_requests boolean not null default true;

create index if not exists djs_event_active_acceptance_sort_idx
  on public.djs (event_id, is_active, accepts_requests, sort_order);
