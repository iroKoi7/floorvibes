alter table public.requests
  add column if not exists song_artist text,
  add column if not exists song_artwork_url text,
  add column if not exists song_provider text,
  add column if not exists song_provider_id text,
  add column if not exists song_url text;

create index if not exists requests_song_provider_id_idx
  on public.requests (song_provider, song_provider_id)
  where song_provider_id is not null;
