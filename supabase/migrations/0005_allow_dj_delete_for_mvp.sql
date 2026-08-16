grant delete on public.djs to anon;
grant delete on public.djs to authenticated;

drop policy if exists "Anyone can delete DJs for MVP" on public.djs;
create policy "Anyone can delete DJs for MVP"
  on public.djs
  for delete
  to anon, authenticated
  using (true);
