import { NextResponse } from 'next/server';

const BASE = process.env.NEXT_PUBLIC_JELLYFIN_URL?.replace(/\/$/, '');
const KEY  = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY;

export async function GET() {
  if (!BASE || !KEY) {
    return NextResponse.json({
      error: 'Jellyfin not configured',
      serverName: 'Not Configured',
      version: '?',
      operatingSystem: 'Not Configured',
      systemArch: '?',
      activeSessions: [],
      libraries: [],
      storage: [],
      recentlyAdded: [],
      continueWatching: [],
    });
  }

  try {
    const headers = { 'X-Emby-Token': KEY };

    const infoRes = await fetch(`${BASE}/System/Info`, { headers });

    if (!infoRes.ok) {
      return NextResponse.json({
        error: `Jellyfin connection failed: ${infoRes.status}`,
        serverName: 'Connection Failed',
        version: '?',
        operatingSystem: 'Unknown',
        systemArch: '?',
        activeSessions: [],
        libraries: [],
        storage: [],
        recentlyAdded: [],
        continueWatching: [],
      });
    }

    const info = await infoRes.json();
    const operatingSystem = info.OperatingSystemDisplayName || info.OperatingSystem || 'Linux';
    const cleanOS = operatingSystem.split(' ')[0];
    const arch = info.SystemArchitecture || 'x64';

    // Get user ID for per-user endpoints
    const usersRes = await fetch(`${BASE}/Users`, { headers });
    const users    = usersRes.ok ? await usersRes.json() : [];
    const userId   = users[0]?.Id ?? null;

    const [sessionsRes, libRes, storageRes, recentRes, continueRes] = await Promise.all([
      fetch(`${BASE}/Sessions`, { headers }),
      fetch(`${BASE}/Library/VirtualFolders`, { headers }),
      fetch(`${BASE}/System/Storage`, { headers }).catch(() => null),
      userId
        ? fetch(`${BASE}/Users/${userId}/Items/Latest?Limit=12&Fields=PrimaryImageAspectRatio,Overview`, { headers })
        : Promise.resolve(null),
      userId
        ? fetch(`${BASE}/Users/${userId}/Items/Resume?Limit=6&Fields=PrimaryImageAspectRatio,Overview`, { headers })
        : Promise.resolve(null),
    ]);

    const sessions       = sessionsRes.ok ? await sessionsRes.json() : [];
    const libraries      = libRes.ok      ? await libRes.json()      : [];
    const storage        = storageRes?.ok ? await storageRes.json()  : null;
    const recentRaw      = recentRes?.ok  ? await recentRes.json()   : [];
    const continueRaw    = continueRes?.ok ? await continueRes.json() : { Items: [] };

    const activeSessions = sessions.filter((s: any) => s.NowPlayingItem);

    const mapItem = (item: any) => ({
      id:         item.Id,
      title:      item.Name,
      type:       item.Type,
      year:       item.ProductionYear ?? null,
      seriesName: item.SeriesName ?? null,
      overview:   item.Overview ?? null,
      poster:     `${BASE}/Items/${item.Id}/Images/Primary?api_key=${KEY}&maxHeight=300`,
      backdrop:   item.BackdropImageTags?.length
        ? `${BASE}/Items/${item.Id}/Images/Backdrop?api_key=${KEY}&maxHeight=400`
        : null,
      progress:   item.UserData?.PlayedPercentage
        ? Math.round(item.UserData.PlayedPercentage)
        : null,
    });

    return NextResponse.json({
      serverName:      info.ServerName || 'Jellyfin',
      version:         info.Version || '?',
      operatingSystem: cleanOS,
      systemArch:      arch,
      canSelfRestart:  info.CanSelfRestart || false,
      storage: storage?.Drives?.map((d: any) => ({
        name:  d.Name,
        path:  d.Path,
        total: Math.round(d.TotalSpaceSize / 1073741824),
        free:  Math.round(d.FreeSpaceSize / 1073741824),
        used:  Math.round((d.TotalSpaceSize - d.FreeSpaceSize) / 1073741824),
        pct:   Math.round(((d.TotalSpaceSize - d.FreeSpaceSize) / d.TotalSpaceSize) * 100),
      })) ?? [],
      activeSessions: activeSessions.map((s: any) => ({
        user:       s.UserName,
        device:     s.DeviceName,
        client:     s.Client,
        title:      s.NowPlayingItem?.Name,
        type:       s.NowPlayingItem?.Type,
        seriesName: s.NowPlayingItem?.SeriesName,
        progress:   s.PlayState?.PositionTicks && s.NowPlayingItem?.RunTimeTicks
          ? Math.round((s.PlayState.PositionTicks / s.NowPlayingItem.RunTimeTicks) * 100)
          : 0,
        isPaused:   s.PlayState?.IsPaused,
        thumbUrl:   s.NowPlayingItem?.Id
          ? `${BASE}/Items/${s.NowPlayingItem.Id}/Images/Backdrop?api_key=${KEY}`
          : null,
      })),
      libraries: libraries.map((l: any) => ({
        name:  l.Name,
        type:  l.CollectionType || 'Unknown',
        count: l.ItemCount ?? null,
      })),
      recentlyAdded:   Array.isArray(recentRaw) ? recentRaw.map(mapItem) : [],
      continueWatching: (continueRaw?.Items ?? []).map(mapItem),
    });
  } catch (err) {
    console.error('Jellyfin API error:', err);
    return NextResponse.json({
      error: 'Failed to reach Jellyfin',
      serverName: 'Unavailable',
      version: '?',
      operatingSystem: 'Unknown',
      systemArch: '?',
      activeSessions: [],
      libraries: [],
      storage: [],
      recentlyAdded: [],
      continueWatching: [],
    });
  }
}