do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'requests'
  loop
    execute format(
      'drop policy if exists %I on public.requests',
      policy_record.policyname
    );
  end loop;
end $$;

alter table public.requests enable row level security;

grant select, insert on public.requests to anon;
grant select, insert on public.requests to authenticated;

revoke update on public.requests from anon;
revoke update on public.requests from authenticated;

grant update (status) on public.requests to anon;
grant update (status) on public.requests to authenticated;

create policy "Anyone can submit song requests"
  on public.requests
  for insert
  to anon, authenticated
  with check (status = 'pending');

create policy "Anyone can read song requests"
  on public.requests
  for select
  to anon, authenticated
  using (true);

create policy "Anyone can update request status"
  on public.requests
  for update
  to anon, authenticated
  using (true)
  with check (status in ('pending', 'played', 'dismissed'));
