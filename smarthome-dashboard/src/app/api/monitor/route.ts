import { NextResponse } from 'next/server';

const BASE = process.env.NEXT_PUBLIC_JELLYFIN_URL?.replace(/\/$/, '');
const KEY  = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY;

export async function GET() {
  if (!BASE || !KEY) return NextResponse.json({ error: 'Jellyfin not configured' }, { status: 400 });

  try {
    const headers = { 'X-Emby-Token': KEY };

    const [infoRes, sessionsRes, libRes, storageRes] = await Promise.all([
      fetch(`${BASE}/System/Info`,              { headers }),
      fetch(`${BASE}/Sessions`,                 { headers }),
      fetch(`${BASE}/Library/VirtualFolders`,   { headers }),
      fetch(`${BASE}/System/Storage`,           { headers }),
    ]);


    const [info, sessions, libraries, storage] = await Promise.all([
      infoRes.json(),
      sessionsRes.json(),
      libRes.json(),
      storageRes.ok ? storageRes.json() : null,
    ]);

    const activeSessions = sessions.filter((s: any) => s.NowPlayingItem);

    return NextResponse.json({
      serverName:    info.ServerName,
      version:       info.Version,
      operatingSystem: info.OperatingSystem,
      systemArch:      info.SystemArchitecture,
      canSelfRestart:  info.CanSelfRestart,
      storage: storage?.Drives?.map((d: any) => ({
        name:  d.Name,
        path:  d.Path,
        total: Math.round(d.TotalSpaceSize / 1073741824),
        free:  Math.round(d.FreeSpaceSize  / 1073741824),
        used:  Math.round((d.TotalSpaceSize - d.FreeSpaceSize) / 1073741824),
        pct:   Math.round(((d.TotalSpaceSize - d.FreeSpaceSize) / d.TotalSpaceSize) * 100),
      })) ?? null,
      activeSessions: activeSessions.map((s: any) => ({
        user:        s.UserName,
        device:      s.DeviceName,
        client:      s.Client,
        title:       s.NowPlayingItem?.Name,
        type:        s.NowPlayingItem?.Type,
        seriesName:  s.NowPlayingItem?.SeriesName,
        progress:    s.PlayState?.PositionTicks && s.NowPlayingItem?.RunTimeTicks
          ? Math.round((s.PlayState.PositionTicks / s.NowPlayingItem.RunTimeTicks) * 100)
          : 0,
        isPaused:    s.PlayState?.IsPaused,
        thumbUrl:    s.NowPlayingItem?.Id
          ? `${BASE}/Items/${s.NowPlayingItem.Id}/Images/Backdrop?api_key=${KEY}`
          : null,
      })),
      libraries: libraries.map((l: any) => ({
        name:  l.Name,
        type:  l.CollectionType,
        count: l.ItemCount ?? null,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to reach Jellyfin' }, { status: 500 });
  }
}