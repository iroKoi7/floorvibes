alter table public.events
  add column if not exists end_cta_label text,
  add column if not exists end_cta_url text,
  add column if not exists like_mode text not null default 'multiple';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_like_mode_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_like_mode_check check (like_mode in ('single', 'multiple'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_end_cta_label_length_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_end_cta_label_length_check
      check (end_cta_label is null or length(trim(end_cta_label)) <= 40);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_end_cta_url_format_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_end_cta_url_format_check
      check (end_cta_url is null or end_cta_url ~ '^https?://');
  end if;
end $$;
