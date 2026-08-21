create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  subject text not null,
  body text not null,
  contact text,
  source text not null default 'about',
  status text not null default 'new',
  constraint contact_messages_status_check check (status in ('new', 'reviewed', 'archived')),
  constraint contact_messages_subject_length_check check (
    length(trim(subject)) between 1 and 120
  ),
  constraint contact_messages_body_length_check check (
    length(trim(body)) between 1 and 2000
  ),
  constraint contact_messages_contact_length_check check (
    contact is null or length(trim(contact)) <= 160
  )
);

alter table public.contact_messages enable row level security;

grant insert on public.contact_messages to anon, authenticated;
revoke select, update, delete on public.contact_messages from anon, authenticated;

drop policy if exists "Anyone can send contact messages" on public.contact_messages;

create policy "Anyone can send contact messages"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (status = 'new');
