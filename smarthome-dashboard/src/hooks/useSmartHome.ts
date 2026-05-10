import { useState, useCallback, useEffect, useRef } from 'react';

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
}

export interface SmartHomeDevice {
  id: string;
  name: string;
  type: 'speaker' | 'speaker_group' | 'tv' | 'unknown';
  state: string;
  attributes: Record<string, any>;
}

const HA_URL  = process.env.NEXT_PUBLIC_HA_URL  ?? 'http://localhost:8123';
const HA_TOKEN = process.env.NEXT_PUBLIC_HA_TOKEN ?? '';

// Map HA entity domains/attributes to our device types
function classifyDevice(entity: HAEntity): SmartHomeDevice['type'] {
  const id = entity.entity_id;
  const attrs = entity.attributes;

  if (id.startsWith('media_player.')) {
    const deviceClass = attrs.device_class ?? '';
    const model = (attrs.friendly_name ?? '').toLowerCase();

    if (deviceClass === 'tv' || model.includes('tv') || model.includes('chromecast')) return 'tv';
    if (attrs.group_members?.length > 0) return 'speaker_group';
    return 'speaker';
  }

  return 'unknown';
}

function toDevice(entity: HAEntity): SmartHomeDevice {
  return {
    id: entity.entity_id,
    name: entity.attributes.friendly_name ?? entity.entity_id,
    type: classifyDevice(entity),
    state: entity.state,
    attributes: entity.attributes,
  };
}

async function haFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${HA_URL}/api${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`HA API error: ${res.status}`);
  return res.json();
}

async function callService(domain: string, service: string, data: Record<string, any>) {
  return haFetch(`/services/${domain}/${service}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function useSmartHome() {
  const [devices, setDevices]     = useState<SmartHomeDevice[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const msgIdRef = useRef(1);

  // ── Fetch all media_player entities ──────────────────────────────────────
  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entities: HAEntity[] = await haFetch('/states');
      const mediaPlayers = entities
        .filter(e => e.entity_id.startsWith('media_player.'))
        .map(toDevice);
      setDevices(mediaPlayers);
      setConnected(true);
    } catch (e: any) {
      setError(e.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── WebSocket for real-time state updates ─────────────────────────────────
  const connectWs = useCallback(() => {
    const wsUrl = HA_URL.replace(/^http/, 'ws') + '/api/websocket';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // HA WS auth flow: server sends auth_required, we send auth
    };

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);

      if (msg.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: HA_TOKEN }));
        return;
      }

      if (msg.type === 'auth_ok') {
        // Subscribe to state changes for media_player entities
        ws.send(JSON.stringify({
          id: msgIdRef.current++,
          type: 'subscribe_events',
          event_type: 'state_changed',
        }));
        return;
      }

      if (msg.type === 'event' && msg.event?.event_type === 'state_changed') {
        const { entity_id, new_state } = msg.event.data;
        if (!entity_id.startsWith('media_player.') || !new_state) return;

        setDevices(prev => {
          const idx = prev.findIndex(d => d.id === entity_id);
          const updated = toDevice(new_state as HAEntity);
          if (idx === -1) return [...prev, updated];
          const next = [...prev];
          next[idx] = updated;
          return next;
        });
      }
    };

    ws.onerror = () => setError('WebSocket error');
    ws.onclose = () => {
      // Reconnect after 5s if closed unexpectedly
      setTimeout(() => { if (wsRef.current === ws) connectWs(); }, 5000);
    };
  }, []);

  useEffect(() => {
    if (!HA_TOKEN) return;
    fetchDevices();
    connectWs();
    return () => { wsRef.current?.close(); };
  }, []);

  // ── Media player controls ─────────────────────────────────────────────────
  const play = useCallback((entityId: string) =>
    callService('media_player', 'media_play', { entity_id: entityId }), []);

  const pause = useCallback((entityId: string) =>
    callService('media_player', 'media_pause', { entity_id: entityId }), []);

  const stop = useCallback((entityId: string) =>
    callService('media_player', 'media_stop', { entity_id: entityId }), []);

  const setVolume = useCallback((entityId: string, volume: number) =>
    callService('media_player', 'volume_set', {
      entity_id: entityId,
      volume_level: Math.max(0, Math.min(1, volume)),
    }), []);

  const mute = useCallback((entityId: string, muted: boolean) =>
    callService('media_player', 'volume_mute', {
      entity_id: entityId,
      is_volume_muted: muted,
    }), []);

  const playMedia = useCallback((entityId: string, url: string, mediaType = 'music') =>
    callService('media_player', 'play_media', {
      entity_id: entityId,
      media_content_id: url,
      media_content_type: mediaType,
    }), []);

  const turnOn = useCallback((entityId: string) =>
    callService('media_player', 'turn_on', { entity_id: entityId }), []);

  const turnOff = useCallback((entityId: string) =>
    callService('media_player', 'turn_off', { entity_id: entityId }), []);

  const joinGroup = useCallback((entityId: string, groupId: string) =>
    callService('media_player', 'join', {
      entity_id: groupId,
      group_members: [entityId],
    }), []);

  const leaveGroup = useCallback((entityId: string) =>
    callService('media_player', 'unjoin', { entity_id: entityId }), []);

  return {
    devices,
    loading,
    error,
    connected,
    fetchDevices,
    // controls
    play,
    pause,
    stop,
    setVolume,
    mute,
    playMedia,
    turnOn,
    turnOff,
    joinGroup,
    leaveGroup,
    // helpers
    speakers:      devices.filter(d => d.type === 'speaker'),
    speakerGroups: devices.filter(d => d.type === 'speaker_group'),
    tvs:           devices.filter(d => d.type === 'tv'),
  };
}