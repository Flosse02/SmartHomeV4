import { useState, useCallback } from 'react';

const BASE = process.env.NEXT_PUBLIC_JELLYFIN_URL ?? '';
const API_KEY = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY ?? '';

export interface JellyfinItem {
  Id: string;
  Name: string;
  AlbumArtist?: string;
  Artists?: string[];
  Album?: string;
  RunTimeTicks?: number;
  Type: string;
  ImageTags?: { Primary?: string };
}

export function useJellyfinLibrary() {
  const [results, setResults] = useState<JellyfinItem[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `${BASE}/Items?SearchTerm=${encodeURIComponent(query)}&IncludeItemTypes=Audio&Recursive=true&Limit=30&api_key=${API_KEY}`
      );
      const data = await res.json();
      setResults(data.Items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${BASE}/Items?IncludeItemTypes=MusicAlbum&Recursive=true&SortBy=DateCreated&SortOrder=Descending&Limit=20&api_key=${API_KEY}`
      );
      const data = await res.json();
      setResults(data.Items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAlbumTracks = useCallback(async (albumId: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${BASE}/Items?ParentId=${albumId}&IncludeItemTypes=Audio&Recursive=true&SortBy=IndexNumber&api_key=${API_KEY}`
      );
      const data = await res.json();
      setResults(data.Items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const imageUrl = (item: JellyfinItem) =>
    item.ImageTags?.Primary
      ? `${BASE}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}&maxHeight=60&quality=80`
      : null;

  const ticksToTime = (ticks?: number) => {
    if (!ticks) return '';
    const s = Math.floor(ticks / 10_000_000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return { results, loading, search, getAlbums, getAlbumTracks, imageUrl, ticksToTime };
}