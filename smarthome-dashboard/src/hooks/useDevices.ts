import { NowPlaying } from '@/components/kiosk/types';
import { useState, useCallback, useEffect, useRef } from 'react';
import * as mm from 'music-metadata-browser';

export interface SmartDevice {
  id: string;
  name: string;
  type: 'browser' | 'renderer';
  location: string;
  ip: string;
}

export type PlaybackState = {
  playing: boolean;
  position: number;
  duration: number;
  updatedAt: number;
  positionFetchedAt: number;
  volume: number;

  itemId?: string;
  title?: string;
  artist?: string;
  album?: string;
};

export type UseDevicesResult = ReturnType<typeof useDevices>

const HA_URL   = process.env.NEXT_PUBLIC_HA_URL            ?? '';
const HA_TOKEN = process.env.NEXT_PUBLIC_HA_TOKEN          ?? '';
const JF_URL   = process.env.NEXT_PUBLIC_JELLYFIN_URL      ?? '';
const JF_KEY   = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY  ?? '';

export const BROWSER_DEVICE: SmartDevice = {
  id:       'browser',
  name:     'This Browser',
  type:     'browser',
  location: 'browser',
  ip:       '',
};

const INITIAL_BROWSER_STATE: PlaybackState = {
  playing: false, position: 0, duration: 0,
  updatedAt: Date.now(), positionFetchedAt: 0, volume: 0,
};

export function useDevices() {

  const [haDevices, setHaDevices] = useState<SmartDevice[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  const devices: SmartDevice[] = [BROWSER_DEVICE, ...haDevices];

  // ── Playback state ──────────────────────────────────────────────────
  const [playback, setPlayback] = useState<Record<string, PlaybackState>>({
    browser: INITIAL_BROWSER_STATE,
  });

  const playbackRef = useRef<Record<string, PlaybackState>>({
    browser: INITIAL_BROWSER_STATE,
  });

  const durationCacheRef = useRef<Record<string, number>>({});

  const patchPlayback = useCallback((location: string, patch: Partial<PlaybackState>) => {
    setPlayback(prev => {
      const next = { ...prev, [location]: { ...prev[location], ...patch, updatedAt: Date.now() } };
      playbackRef.current = next;
      return next;
    });
  }, []);


  // ── Browser audio element ───────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    const audio = getAudio();

    const safeDuration = () => {
      const d = audio.duration;
      return isFinite(d) && d > 0 ? d : 0;
    };

    const onTimeUpdate     = () => patchPlayback('browser', { position: audio.currentTime });
    const onDurationChange = () => { const d = safeDuration(); if (d > 0) patchPlayback('browser', { duration: d }); };
    const onPlay           = () => patchPlayback('browser', { playing: true });
    const onPause          = () => patchPlayback('browser', { playing: false });
    const onEnded          = () => patchPlayback('browser', { playing: false, position: 0 });

    audio.addEventListener('timeupdate',     onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('ended',          onEnded);

    return () => {
      audio.removeEventListener('timeupdate',     onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('ended',          onEnded);
    };
  }, [getAudio, patchPlayback]);

  // ── HA discovery ────────────────────────────────────────────────────
  const discover = useCallback(async () => {
    setDiscovering(true);
    setDiscoverError(null);
    try {
      const res = await fetch(`${HA_URL}/api/states`, {
        headers: { Authorization: `Bearer ${HA_TOKEN}` },
      });
      if (!res.ok) throw new Error(`HA error ${res.status}`);
      const entities: any[] = await res.json();
      const speakers = entities
        .filter(e => e.entity_id.startsWith('media_player.') && e.state !== 'unavailable')
        .map(e => ({
          id:       e.entity_id,
          name:     e.attributes.friendly_name ?? e.entity_id,
          type:     'renderer' as const,
          location: e.entity_id,
          ip:       '',
        }));
      setHaDevices(speakers);
    } catch (e: any) {
      setDiscoverError(e.message);
    } finally {
      setDiscovering(false);
    }
  }, []);

  // ── HA state sync ───────────────────────────────────────────────────
  const syncHaDevice = useCallback(async (entityId: string) => {
    try {
      const res = await fetch(`${HA_URL}/api/states/${entityId}`, {
        headers: { Authorization: `Bearer ${HA_TOKEN}` },
      });
      if (!res.ok) return;
      const e = await res.json();

      const contentId: string = e.attributes.media_content_id ?? '';
      const match    = contentId.match(/\/Audio\/([a-f0-9]+)\/stream/i);
      const duration = match ? (durationCacheRef.current[match[1]] ?? 0) : 0;

      const newPosition  = e.attributes.media_position ?? 0;
      const prev         = playbackRef.current[entityId];
      const prevPosition = prev?.position ?? 0;

      const useNewPosition    = newPosition > 1 || (newPosition > 0 && prevPosition < 1);
      const position          = useNewPosition ? newPosition : prevPosition;
      const positionFetchedAt = useNewPosition
        ? (e.attributes.media_position_updated_at
            ? new Date(e.attributes.media_position_updated_at).getTime()
            : Date.now())
        : (prev?.positionFetchedAt ?? Date.now());

      patchPlayback(entityId, {
        playing: e.state === 'playing',
        position,
        duration,
        positionFetchedAt,
        volume: e.attributes.volume_level ?? 1,
        title:  e.attributes.media_title       ?? prev?.title,
        artist: e.attributes.media_artist      ?? prev?.artist,
        album:  e.attributes.media_album_name  ?? prev?.album,
      });
    } catch { /* ignore */ }
  }, [patchPlayback]);

  useEffect(() => {
    if (!haDevices.length) return;
    const id = setInterval(() => haDevices.forEach(d => syncHaDevice(d.location)), 2000);
    return () => clearInterval(id);
  }, [haDevices, syncHaDevice]);

  // ── Play ─────────────────────────────────────────────────────────────
  const playOnDevice = useCallback(async (
    device: SmartDevice,
    itemId: string,
    durationSecs?: number,
    seekToSeconds = 0,
    metadata?: { title?: string; artist?: string; album?: string }
  ) => {
    if (durationSecs) durationCacheRef.current[itemId] = durationSecs;

    if (device.type === 'browser') {
      const url   = `${JF_URL}/Audio/${itemId}/stream.mp3?api_key=${JF_KEY}`;
      const audio = getAudio();

      audio.pause();
      audio.src = url;
      audio.load();

      patchPlayback('browser', {
        playing: true,
        position: seekToSeconds,
        itemId,
        title:  metadata?.title,
        artist: metadata?.artist,
        album:  metadata?.album,
      });

      const onCanPlay = () => {
        audio.removeEventListener('canplay', onCanPlay);
        if (seekToSeconds > 0) audio.currentTime = seekToSeconds;
      };
      audio.addEventListener('canplay', onCanPlay);

      try {
        await audio.play();
        const duration = durationCacheRef.current[itemId] ?? 0;
        if (duration) patchPlayback('browser', { duration });
      } catch (e: any) {
        if (e.name !== 'AbortError') console.error('Play failed:', e);
      }
      return;
    }

    const streamUrl = `${JF_URL}/Audio/${itemId}/stream.mp3?api_key=${JF_KEY}`
      + (seekToSeconds > 0 ? `&StartTimeTicks=${Math.floor(seekToSeconds * 10_000_000)}` : '');

    await fetch(`${HA_URL}/api/services/media_player/play_media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_id:          device.location,
        media_content_id:   streamUrl,
        media_content_type: 'music',
        enqueue:            'play',
      }),
    });

    patchPlayback(device.location, {
      playing:           true,
      position:          seekToSeconds,
      positionFetchedAt: Date.now(),
    });

    setTimeout(() => syncHaDevice(device.location), 2000);
  }, [getAudio, patchPlayback, syncHaDevice]);

  // ── Pause ────────────────────────────────────────────────────────────
  const pauseDevice = useCallback(async (device: SmartDevice) => {
    if (device.type === 'browser') { getAudio().pause(); return; }
    await fetch(`${HA_URL}/api/services/media_player/media_pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: device.location }),
    });
    syncHaDevice(device.location);
  }, [getAudio, syncHaDevice]);

  // ── Resume ───────────────────────────────────────────────────────────
  const resumeDevice = useCallback(async (device: SmartDevice) => {
    if (device.type === 'browser') { await getAudio().play(); return; }
    await fetch(`${HA_URL}/api/services/media_player/media_play`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: device.location }),
    });
    syncHaDevice(device.location);
  }, [getAudio, syncHaDevice]);

  // ── Seek (ratio 0–1) ─────────────────────────────────────────────────
  const seekDevice = useCallback(async (device: SmartDevice, ratio: number) => {
    const state = playback[device.location];
    if (!state?.duration) return;
    const position = ratio * state.duration;
    if (device.type === 'browser') { getAudio().currentTime = position; return; }
    await fetch(`${HA_URL}/api/services/media_player/media_seek`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: device.location, seek_position: position }),
    });
  }, [getAudio, playback]);

  // ── Stop browser ─────────────────────────────────────────────────────
  const stopBrowser = useCallback(() => {
    const audio = getAudio();
    audio.pause();
    patchPlayback('browser', { playing: false, position: 0, duration: 0 });
  }, [getAudio, patchPlayback]);

  // ── Volume ───────────────────────────────────────────────────────────
  const setVolume = useCallback(async (device: SmartDevice, volume: number) => {
    if (device.type === 'browser') return; // handled via audioRef in MusicPlayer
    await fetch(`${HA_URL}/api/services/media_player/volume_set`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: device.location, volume_level: Math.max(0, Math.min(1, volume)) }),
    });
  }, []);

  // ── Play local URL ───────────────────────────────────────────────────
const playUrl = useCallback(async (url: string) => {
  const audio = getAudio();
  audio.pause();
  audio.src = url;
  audio.load();

  // Try to read ID3 tags from the file
  let title = url.split('/').pop()?.replace(/\.[^.]+$/, '') ?? url;
  let artist = '';
  let album  = '';

  try {
    const metadata = await mm.fetchFromUrl(url);
    title  = metadata.common.title  ?? title;
    artist = metadata.common.artist ?? '';
    album  = metadata.common.album  ?? '';
  } catch {
    // Fall back to filename parsing if tags aren't available
    const decoded = decodeURIComponent(url);
    const file    = decoded.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
    const [a, t]  = file.includes(' - ') ? file.split(' - ') : ['', file];
    artist = a;
    title  = t || title;
  }

  patchPlayback('browser', { playing: true, position: 0, itemId: url, title, artist, album });

  try {
    await audio.play();
  } catch (e: any) {
    if (e.name !== 'AbortError') console.error(e);
  }
}, [getAudio, patchPlayback]);

  
  const nowPlaying: NowPlaying | null = (() => {
    // Check HA renderer devices first (they're the non-browser ones)
    const activeRenderer = Object.entries(playback).find(
      ([location, state]) => location !== 'browser' && state.playing
    );

    const state = activeRenderer
      ? activeRenderer[1]
      : playback['browser'];

    if (!state?.playing) return null;

    return {
      title:    state.title  ?? 'Unknown Track',
      artist:   state.artist ?? 'Unknown Artist',
      playing:  state.playing,
      position: state.position,
      duration: state.duration,
    };
  })();

  return {
    devices,
    discovering,
    discoverError,
    discover,
    playback,
    playbackRef,
    audioRef,
    syncHaDevice,
    playOnDevice,
    pauseDevice,
    resumeDevice,
    setVolume,
    seekDevice,
    stopBrowser,
    playUrl,
    nowPlaying,
  };
}