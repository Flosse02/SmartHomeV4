import { useState, useCallback, useEffect, useRef } from 'react';

export interface SmartDevice {
  id: string;
  name: string;
  type: 'renderer' | 'server';
  location: string;
  ip: string;
}

type DevicePlaybackState = {
  playing: boolean;
  position: number;
  duration: number;
  updatedAt: number;
};

const HA_URL = process.env.NEXT_PUBLIC_HA_URL ?? '';
const HA_TOKEN = process.env.NEXT_PUBLIC_HA_TOKEN ?? '';

export function useDevices() {
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [playback, setPlayback] =
    useState<Record<string, DevicePlaybackState>>({});

  // ───────────────────────────────
  // Device discovery
  // ───────────────────────────────
  const discover = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${HA_URL}/api/states`, {
        headers: { Authorization: `Bearer ${HA_TOKEN}` },
      });

      if (!res.ok) throw new Error(`HA error: ${res.status}`);

      const entities: any[] = await res.json();

      const speakers = entities
        .filter(e => e.entity_id.startsWith('media_player.'))
        .filter(e => e.state !== 'unavailable')
        .map(e => ({
          id: e.entity_id,
          name: e.attributes.friendly_name ?? e.entity_id,
          type: 'renderer' as const,
          location: e.entity_id,
          ip: '',
        }));

      setDevices(speakers);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ───────────────────────────────
  // Sync single device state
  // ───────────────────────────────
  const syncDevice = useCallback(async (entityId: string) => {
    const res = await fetch(`${HA_URL}/api/states/${entityId}`, {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
    });

    if (!res.ok) return;

    const e = await res.json();

    const position = e.attributes.media_position ?? 0;
    const duration = e.attributes.media_length ?? 0;

    setPlayback(prev => ({
      ...prev,
      [entityId]: {
        playing: e.state === 'playing',
        position,
        duration,
        updatedAt: Date.now(),
      },
    }));
  }, []);

  // ───────────────────────────────
  // Polling sync
  // ───────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      devices.forEach(d => syncDevice(d.location));
    }, 1000);

    return () => clearInterval(interval);
  }, [devices, syncDevice]);

  // ───────────────────────────────
  // Play
  // ───────────────────────────────
  const playOnDevice = useCallback(async (
    device: SmartDevice,
    itemId: string
  ) => {
    const streamUrl =
      `${process.env.NEXT_PUBLIC_JELLYFIN_URL}/Audio/${itemId}/stream.mp3` +
      `?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}`;

    await fetch(`${HA_URL}/api/services/media_player/play_media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entity_id: device.location,
        media_content_id: streamUrl,
        media_content_type: 'music',
        enqueue: 'play',
      }),
    });

    syncDevice(device.location);
  }, [syncDevice]);

  // ───────────────────────────────
  // Pause
  // ───────────────────────────────
  const pauseDevice = useCallback(async (device: SmartDevice) => {
    await fetch(`${HA_URL}/api/services/media_player/media_pause`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entity_id: device.location,
      }),
    });

    syncDevice(device.location);
  }, [syncDevice]);

  // ───────────────────────────────
  // Resume
  // ───────────────────────────────
  const resumeDevice = useCallback(async (device: SmartDevice) => {
    await fetch(`${HA_URL}/api/services/media_player/media_play`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entity_id: device.location,
      }),
    });

    syncDevice(device.location);
  }, [syncDevice]);

  // ───────────────────────────────
  // Seek
  // ───────────────────────────────
  const seekDevice = useCallback(async (
    device: SmartDevice,
    ratio: number
  ) => {
    const state = playback[device.location];
    if (!state?.duration) return;

    const seek_position = ratio * state.duration;

    await fetch(`${HA_URL}/api/services/media_player/media_seek`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entity_id: device.location,
        seek_position,
      }),
    });
  }, [playback]);

  // ───────────────────────────────
  // API
  // ───────────────────────────────
  return {
    devices,
    loading,
    error,
    discover,
    playOnDevice,
    pauseDevice,
    resumeDevice,
    seekDevice,
    syncDevice,
    playback,
  };
}