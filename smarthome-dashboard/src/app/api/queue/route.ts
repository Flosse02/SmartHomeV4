import { NextResponse } from 'next/server';

const RADARR_BASE = process.env.NEXT_PUBLIC_RADARR_URL?.replace(/\/$/, '');
const RADARR_KEY  = process.env.NEXT_PUBLIC_RADARR_KEY;
const SONARR_BASE = process.env.NEXT_PUBLIC_SONARR_URL?.replace(/\/$/, '');
const SONARR_KEY  = process.env.NEXT_PUBLIC_SONARR_KEY;

async function fetchQueue(base: string, key: string, type: 'movie' | 'tv') {
  const res = await fetch(`${base}/api/v3/queue?pageSize=50&includeUnknownMovieItems=true`, {
    headers: { 'X-Api-Key': key },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.records ?? []).map((r: any) => ({
    id:         r.id,
    title:      r.title,
    type,
    status:     r.status,           // 'downloading', 'completed', 'failed', 'paused', 'queued'
    trackedStatus: r.trackedDownloadStatus, // 'ok', 'warning', 'error'
    progress:   r.sizeleft != null && r.size
      ? Math.round(((r.size - r.sizeleft) / r.size) * 100)
      : 0,
    size:       r.size       ? `${(r.size / 1073741824).toFixed(1)} GB`       : null,
    sizeleft:   r.sizeleft   ? `${(r.sizeleft / 1073741824).toFixed(1)} GB`   : null,
    eta:        r.estimatedCompletionTime ?? null,
    errorMsg:   r.errorMessage ?? null,
    quality:    r.quality?.quality?.name ?? null,
  }));
}

export async function GET() {
  const results = await Promise.allSettled([
    RADARR_BASE && RADARR_KEY ? fetchQueue(RADARR_BASE, RADARR_KEY, 'movie') : Promise.resolve([]),
    SONARR_BASE && SONARR_KEY ? fetchQueue(SONARR_BASE, SONARR_KEY, 'tv')    : Promise.resolve([]),
  ]);

  const movies = results[0].status === 'fulfilled' ? results[0].value : [];
  const tv     = results[1].status === 'fulfilled' ? results[1].value : [];

  const all = [...movies, ...tv].sort((a, b) => {
    const order: Record<string, number> = { downloading: 0, queued: 1, paused: 2, completed: 3, failed: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  return NextResponse.json({ queue: all });
}