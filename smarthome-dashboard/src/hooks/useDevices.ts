import { useState, useCallback, useEffect, useRef } from 'react';

export interface SmartDevice {
  id: string;
  name: string;
  type: 'browser' | 'renderer';
  location: string; // entity_id for HA devices, 'browser' for local
  ip: string;
}

export type PlaybackState = {
  playing: boolean;
  position: number;   // seconds
  duration: number;   // seconds
  updatedAt: number;
  positionFetchedAt: number; 
};

const HA_URL   = process.env.NEXT_PUBLIC_HA_URL   ?? '';
const HA_TOKEN = process.env.NEXT_PUBLIC_HA_TOKEN ?? '';

const JF_URL   = process.env.NEXT_PUBLIC_JELLYFIN_URL     ?? '';
const JF_KEY   = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY ?? '';

// ─── Virtual browser device ──────────────────────────────────────────────────
export const BROWSER_DEVICE: SmartDevice = {
  id:       'browser',
  name:     'This Browser',
  type:     'browser',
  location: 'browser',
  ip:       '',
};

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useDevices() {

  // ── HA devices list ───────────────────────────────────────────────
  const [haDevices, setHaDevices] = useState<SmartDevice[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  // All devices = browser + HA
  const devices: SmartDevice[] = [BROWSER_DEVICE, ...haDevices];

  // ── Playback state map (keyed by device.location) ─────────────────
  const [playback, setPlayback] = useState<Record<string, PlaybackState>>({
    browser: { playing: false, position: 0, duration: 0, updatedAt: Date.now(), positionFetchedAt: 0 },
  });
  const durationCacheRef = useRef<Record<string, number>>({});

  const patchPlayback = useCallback((location: string, patch: Partial<PlaybackState>) => {
    setPlayback(prev => ({
      ...prev,
      [location]: { ...prev[location], ...patch, updatedAt: Date.now() },
    }));
  }, []);

  // ── Browser audio element ─────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
    return audioRef.current;
  }, []);

  // Wire up browser audio → playback state
  useEffect(() => {
    const audio = getAudio();
    console.log("Audio: " + JSON.stringify({
      src:        audio.src,
      duration:   audio.duration,
      currentTime: audio.currentTime,
      paused:     audio.paused,
      ended:      audio.ended,
      readyState: audio.readyState,
      networkState: audio.networkState,
      error:      audio.error,
    }));

    const safeDuration = () => {
      const d = audio.duration;
      return isFinite(d) && d > 0 ? d : 0;
    };

    const onTimeUpdate     = () => patchPlayback('browser', { position: audio.currentTime, duration: safeDuration() });
    const onDurationChange = () => patchPlayback('browser', { duration: safeDuration() });
    const onPlay           = () => patchPlayback('browser', { playing: true });
    const onPause          = () => patchPlayback('browser', { playing: false });
    const onEnded          = () => patchPlayback('browser', { playing: false, position: 0 });

    audio.addEventListener('timeupdate',      onTimeUpdate);
    audio.addEventListener('durationchange',  onDurationChange);
    audio.addEventListener('play',            onPlay);
    audio.addEventListener('pause',           onPause);
    audio.addEventListener('ended',           onEnded);

    return () => {
      audio.removeEventListener('timeupdate',     onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('ended',          onEnded);
    };
  }, [getAudio, patchPlayback]);

  // ── HA device discovery ───────────────────────────────────────────
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

  // ── HA device state sync ──────────────────────────────────────────
  const syncHaDevice = useCallback(async (entityId: string) => {
    try {
      const res = await fetch(`${HA_URL}/api/states/${entityId}`, {
        headers: { Authorization: `Bearer ${HA_TOKEN}` },
      });
      if (!res.ok) return;
      const e = await res.json();

      const contentId: string = e.attributes.media_content_id ?? '';
      const match = contentId.match(/\/Audio\/([a-f0-9]+)\/stream/i);
      const duration = match ? (durationCacheRef.current[match[1]] ?? 0) : 0;

      patchPlayback(entityId, {
        playing:           e.state === 'playing',
        position:          e.attributes.media_position ?? 0,
        duration,
        positionFetchedAt: e.attributes.media_position_updated_at
                            ? new Date(e.attributes.media_position_updated_at).getTime()
                            : Date.now(),
      });
    } catch { /* ignore */ }
  }, [patchPlayback]);


  useEffect(() => {
    if (!haDevices.length) return;
    const id = setInterval(() => haDevices.forEach(d => syncHaDevice(d.location)), 2000);
    return () => clearInterval(id);
  }, [haDevices, syncHaDevice]);

  // ─────────────────────────────────────────────────────────────────
  // Unified play
  // ─────────────────────────────────────────────────────────────────
  const playOnDevice = useCallback(async (device: SmartDevice, itemId: string, durationSecs?: number) => {
    if (durationSecs) {
      durationCacheRef.current[itemId] = durationSecs;
    }
    if (device.type === 'browser') {
      const url = `${JF_URL}/Audio/${itemId}/stream.mp3?api_key=${JF_KEY}`;
      const audio = getAudio();
      const meta = await fetch(`${JF_URL}/Items/${itemId}?api_key=${JF_KEY}`);
      const data = await meta.json();
      const duration = data.RunTimeTicks ? data.RunTimeTicks / 10_000_000 : 0;

      audio.src = url;
      audio.currentTime = 0;
      await audio.play();

      // Patch duration immediately — don't wait for durationchange
      patchPlayback('browser', { duration });
      return;
    }


    // HA renderer
    const streamUrl = `${JF_URL}/Audio/${itemId}/stream.mp3?api_key=${JF_KEY}`;
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
    patchPlayback(device.location, { playing: true, position: 0 });
    setTimeout(() => syncHaDevice(device.location), 500);
  }, [getAudio, patchPlayback, syncHaDevice]);

  // ─────────────────────────────────────────────────────────────────
  // Pause
  // ─────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────
  // Resume
  // ─────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────
  // Seek (ratio 0–1)
  // ─────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────
  // Stop browser audio
  // ─────────────────────────────────────────────────────────────────
  const stopBrowser = useCallback(() => {
    const audio = getAudio();
    audio.pause();
    audio.load(); 
    patchPlayback('browser', { playing: false, position: 0, duration: 0 });
  }, [getAudio, patchPlayback]);

  return {
    devices,
    discovering,
    discoverError,
    discover,
    playback,
    playOnDevice,
    pauseDevice,
    resumeDevice,
    seekDevice,
    stopBrowser,
  };
}