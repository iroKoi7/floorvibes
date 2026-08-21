import { NextRequest, NextResponse } from "next/server";
import type { SongSearchResult } from "@/lib/song-search";

const SONG_SEARCH_MIN_CHARS = 3;

type ItunesSearchResponse = {
  resultCount: number;
  results: ItunesSongResult[];
};

type ItunesSongResult = {
  wrapperType?: string;
  kind?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
};

function normalizeArtworkUrl(value?: string) {
  if (!value) return null;
  return value.replace("100x100", "300x300");
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < SONG_SEARCH_MIN_CHARS) {
    return NextResponse.json({ results: [] satisfies SongSearchResult[] });
  }

  const params = new URLSearchParams({
    term: query,
    media: "music",
    entity: "song",
    country: "JP",
    limit: "8",
  });

  const response = await fetch(`https://itunes.apple.com/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 60 * 60,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Song search is temporarily unavailable.", results: [] },
      { status: 502 },
    );
  }

  const data = (await response.json()) as ItunesSearchResponse;
  const results: SongSearchResult[] = data.results
    .filter((item) => item.wrapperType === "track" && item.kind === "song" && item.trackId)
    .map((item) => ({
      id: `itunes:${item.trackId}`,
      title: item.trackName ?? "Unknown title",
      artist: item.artistName ?? "Unknown artist",
      album: item.collectionName ?? null,
      artworkUrl: normalizeArtworkUrl(item.artworkUrl100),
      provider: "itunes",
      providerId: String(item.trackId),
      url: item.trackViewUrl ?? null,
    }));

  return NextResponse.json({ results });
}
