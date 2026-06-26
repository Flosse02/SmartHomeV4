import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.NEXT_PUBLIC_SONARR_URL?.replace(/\/$/, '');
const KEY  = process.env.NEXT_PUBLIC_SONARR_KEY;

const headers = () => ({ 'X-Api-Key': KEY!, 'Content-Type': 'application/json' });

export async function GET(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ error: 'Sonarr not configured' }, { status: 503 });

  const query = req.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

  try {
    const res = await fetch(`${BASE}/api/v3/series/lookup?term=${encodeURIComponent(query)}`, { headers: headers() });
    if (!res.ok) throw new Error(`Sonarr error: ${res.status}`);
    const results = await res.json();

    return NextResponse.json(results.slice(0, 10).map((s: any) => ({
      id:        s.tvdbId,
      title:     s.title,
      year:      s.year,
      overview:  s.overview,
      poster:    s.remotePoster ?? null,
      added:     s.id ? true : false,
      sonarrId:  s.id ?? null,
      titleSlug: s.titleSlug,
      images:    s.images,
      seasons:   s.seasons,
    })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ error: 'Sonarr not configured' }, { status: 503 });

  try {
    const body = await req.json();

    const rootRes = await fetch(`${BASE}/api/v3/rootfolder`, { headers: headers() });
    const roots   = await rootRes.json();
    const rootFolderPath = roots[0]?.path;
    if (!rootFolderPath) throw new Error('No root folder configured in Sonarr');

    const qpRes     = await fetch(`${BASE}/api/v3/qualityprofile`, { headers: headers() });
    const profiles  = await qpRes.json();
    const profileId = profiles[0]?.id ?? 1;

    const res = await fetch(`${BASE}/api/v3/series`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        tvdbId:           body.tvdbId,
        title:            body.title,
        year:             body.year,
        titleSlug:        body.titleSlug,
        images:           body.images ?? [],
        seasons:          body.seasons ?? [],
        rootFolderPath,
        qualityProfileId: profileId,
        monitored:        true,
        seasonFolder:     true,
        addOptions:       { searchForMissingEpisodes: true },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err[0]?.errorMessage ?? `Sonarr error: ${res.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}