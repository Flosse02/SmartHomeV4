import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.NEXT_PUBLIC_RADARR_URL?.replace(/\/$/, '');
const KEY  = process.env.NEXT_PUBLIC_RADARR_KEY;

const headers = () => ({ 'X-Api-Key': KEY!, 'Content-Type': 'application/json' });

export async function GET(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ error: 'Radarr not configured' }, { status: 503 });

  const query = req.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

  try {
    const res = await fetch(`${BASE}/api/v3/movie/lookup?term=${encodeURIComponent(query)}`, { headers: headers() });
    if (!res.ok) throw new Error(`Radarr error: ${res.status}`);
    const results = await res.json();

    return NextResponse.json(results.slice(0, 10).map((m: any) => ({
      id:       m.tmdbId,
      title:    m.title,
      year:     m.year,
      overview: m.overview,
      poster:   m.remotePoster ?? null,
      added:    m.hasFile ?? false,
      monitored: m.id ? true : false,
      radarrId: m.id ?? null,
      titleSlug: m.titleSlug,
      images:   m.images,
    })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ error: 'Radarr not configured' }, { status: 503 });

  try {
    const body = await req.json();

    // Get root folder
    const rootRes = await fetch(`${BASE}/api/v3/rootfolder`, { headers: headers() });
    const roots   = await rootRes.json();
    const rootFolderPath = roots[0]?.path;
    if (!rootFolderPath) throw new Error('No root folder configured in Radarr');

    // Get quality profile
    const qpRes     = await fetch(`${BASE}/api/v3/qualityprofile`, { headers: headers() });
    const profiles  = await qpRes.json();
    const profileId = profiles[0]?.id ?? 1;

    const res = await fetch(`${BASE}/api/v3/movie`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        tmdbId:          body.tmdbId,
        title:           body.title,
        year:            body.year,
        titleSlug:       body.titleSlug,
        images:          body.images ?? [],
        rootFolderPath,
        qualityProfileId: profileId,
        monitored:       true,
        addOptions:      { searchForMovie: true },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err[0]?.errorMessage ?? `Radarr error: ${res.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}