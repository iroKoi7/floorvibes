export type SongSearchResult = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  provider: "itunes";
  providerId: string;
  url: string | null;
};

export function formatSongRequestTitle(song: Pick<SongSearchResult, "title" | "artist">) {
  return `${song.title} - ${song.artist}`;
}
