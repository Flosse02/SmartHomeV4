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
      storage: []
    });
  }

  try {
    const headers = { 'X-Emby-Token': KEY };

    // Fetch system info
    const infoRes = await fetch(`${BASE}/System/Info`, { headers });
    
    if (!infoRes.ok) {
      console.error(`Jellyfin API error: ${infoRes.status}`);
      return NextResponse.json({ 
        error: `Jellyfin connection failed: ${infoRes.status}`,
        serverName: 'Connection Failed',
        version: '?',
        operatingSystem: 'Unknown',
        systemArch: '?',
        activeSessions: [],
        libraries: [],
        storage: []
      });
    }

    const info = await infoRes.json();
    console.log('Jellyfin System Info:', {
      serverName: info.ServerName,
      version: info.Version,
      operatingSystem: info.OperatingSystem,
      systemArch: info.SystemArchitecture,
      os: info.OperatingSystemDisplayName
    });

    // Jellyfin uses different field names - map them properly
    const operatingSystem = info.OperatingSystemDisplayName || 
                           info.OperatingSystem || 
                           'Linux';
    
    // Clean up OS string (remove extra info)
    const cleanOS = operatingSystem.split(' ')[0]; // Gets just "Linux", "Windows", etc.
    
    // Get architecture (remove '64' to show just '64-bit' or similar)
    const arch = info.SystemArchitecture || 'x64';

    // Fetch other data
    const [sessionsRes, libRes, storageRes] = await Promise.all([
      fetch(`${BASE}/Sessions`, { headers }),
      fetch(`${BASE}/Library/VirtualFolders`, { headers }),
      fetch(`${BASE}/System/Storage`, { headers }).catch(() => null),
    ]);

    const sessions = sessionsRes.ok ? await sessionsRes.json() : [];
    const libraries = libRes.ok ? await libRes.json() : [];
    const storage = storageRes?.ok ? await storageRes.json() : null;

    const activeSessions = sessions.filter((s: any) => s.NowPlayingItem);

    return NextResponse.json({
      serverName: info.ServerName || 'Jellyfin',
      version: info.Version || '?',
      operatingSystem: cleanOS,
      systemArch: arch,
      canSelfRestart: info.CanSelfRestart || false,
      storage: storage?.Drives?.map((d: any) => ({
        name: d.Name,
        path: d.Path,
        total: Math.round(d.TotalSpaceSize / 1073741824),
        free: Math.round(d.FreeSpaceSize / 1073741824),
        used: Math.round((d.TotalSpaceSize - d.FreeSpaceSize) / 1073741824),
        pct: Math.round(((d.TotalSpaceSize - d.FreeSpaceSize) / d.TotalSpaceSize) * 100),
      })) ?? [],
      activeSessions: activeSessions.map((s: any) => ({
        user: s.UserName,
        device: s.DeviceName,
        client: s.Client,
        title: s.NowPlayingItem?.Name,
        type: s.NowPlayingItem?.Type,
        seriesName: s.NowPlayingItem?.SeriesName,
        progress: s.PlayState?.PositionTicks && s.NowPlayingItem?.RunTimeTicks
          ? Math.round((s.PlayState.PositionTicks / s.NowPlayingItem.RunTimeTicks) * 100)
          : 0,
        isPaused: s.PlayState?.IsPaused,
        thumbUrl: s.NowPlayingItem?.Id
          ? `${BASE}/Items/${s.NowPlayingItem.Id}/Images/Backdrop?api_key=${KEY}`
          : null,
      })),
      libraries: libraries.map((l: any) => ({
        name: l.Name,
        type: l.CollectionType || 'Unknown',
        count: l.ItemCount ?? null,
      })),
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
      storage: []
    });
  }
}