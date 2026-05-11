import { useState, useCallback, useEffect, useRef } from 'react';

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
};

const HA_URL   = process.env.NEXT_PUBLIC_HA_URL   ?? '';
const HA_TOKEN = process.env.NEXT_PUBLIC_HA_TOKEN ?? '';
const JF_URL   = process.env.NEXT_PUBLIC_JELLYFIN_URL     ?? '';
const JF_KEY   = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY ?? '';

export const BROWSER_DEVICE: SmartDevice = {
  id:       'browser',
  name:     'This Browser',
  type:     'browser',
  location: 'browser',
  ip:       '',
};

const INITIAL_BROWSER_STATE: PlaybackState = {
  playing: false, position: 0, duration: 0,
  updatedAt: Date.now(), positionFetchedAt: 0,
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

  // Mirror of playback kept in sync so callbacks never have stale closures
  const playbackRef = useRef<Record<string, PlaybackState>>({
    browser: INITIAL_BROWSER_STATE,
  });

  const durationCacheRef = useRef<Record<string, number>>({});

  const patchPlayback = useCallback((location: string, patch: Partial<PlaybackState>) => {
    setPlayback(prev => {
      const next = {
        ...prev,
        [location]: { ...prev[location], ...patch, updatedAt: Date.now() },
      };
      playbackRef.current = next; // always in sync
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

      const newPosition = e.attributes.media_position ?? 0;
      const prev        = playbackRef.current[entityId];
      const prevPosition = prev?.position ?? 0;

      // Ignore HA reporting 0 while the Chromecast is still loading the track
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
  ) => {
    if (durationSecs) {
      durationCacheRef.current[itemId] = durationSecs;
    }

    if (device.type === 'browser') {
      const url   = `${JF_URL}/Audio/${itemId}/stream.mp3?api_key=${JF_KEY}`;
      const audio = getAudio();

      audio.pause();
      audio.src = url;
      audio.load();

      // Set position in state immediately so UI doesn't flicker to 0
      patchPlayback('browser', { position: seekToSeconds });

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

    // HA renderer — embed start position directly in the stream URL
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

    // Patch immediately so livePosition interpolates from the right starting point
    patchPlayback(device.location, {
      playing:           true,
      position:          seekToSeconds,
      positionFetchedAt: Date.now(),
    });

    // Give Chromecast time to start before syncing
    setTimeout(() => syncHaDevice(device.location), 2000);
  }, [getAudio, patchPlayback, syncHaDevice]);

  // ── Pause ────────────────────────────────────────────────────────────
  const pauseDevice = useCallback(async (device: SmartDevice) => {
    if (device.type === 'browser') {
      getAudio().pause();
      return;
    }
    await fetch(`${HA_URL}/api/services/media_player/media_pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: device.location }),
    });
    syncHaDevice(device.location);
  }, [getAudio, syncHaDevice]);

  // ── Resume ───────────────────────────────────────────────────────────
  const resumeDevice = useCallback(async (device: SmartDevice) => {
    if (device.type === 'browser') {
      await getAudio().play();
      return;
    }
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

    if (device.type === 'browser') {
      getAudio().currentTime = position;
      return;
    }
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
    seekDevice,
    stopBrowser,
  };
}