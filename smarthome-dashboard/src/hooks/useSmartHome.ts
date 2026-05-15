import { useState, useCallback, useEffect, useRef } from 'react';

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
}

export interface SmartHomeDevice {
  id: string;
  name: string;
  type: 'speaker' | 'speaker_group' | 'tv' | 'unknown' | 'tablet';
  state: string;
  attributes: Record<string, any>;
}

const HA_URL   = process.env.NEXT_PUBLIC_HA_URL   ?? 'http://localhost:8123';
const HA_TOKEN = process.env.NEXT_PUBLIC_HA_TOKEN ?? '';

function classifyDevice(entity: HAEntity, groupEntityIds: string[]): SmartHomeDevice['type'] {
  const id    = entity.entity_id;
  const attrs = entity.attributes;

  if (id.startsWith('media_player.')) {
    const deviceClass = attrs.device_class ?? '';
    const icon        = attrs.icon ?? '';
    const model       = (attrs.friendly_name ?? '').toLowerCase();

    if (groupEntityIds.includes(id)) return 'speaker_group';
    if (deviceClass === 'tv' || model.includes('tv') || model.includes('chromecast')) return 'tv';
    if (icon === 'mdi:tablet' || model.includes('tablet')) return 'tablet';

    return 'speaker';
  }

  return 'unknown';
}

function toDevice(entity: HAEntity, groupEntityIds: string[]): SmartHomeDevice {
  return {
    id:         entity.entity_id,
    name:       entity.attributes.friendly_name ?? entity.entity_id,
    type:       classifyDevice(entity, groupEntityIds),
    state:      entity.state,
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
  const wsRef                     = useRef<WebSocket | null>(null);
  const msgIdRef                  = useRef(1);
  const mountedRef                = useRef(false);

  // Refs to cross-reference device registry → entity registry
  const castGroupDeviceIdsRef  = useRef<string[]>([]);
  const castGroupEntityIdsRef  = useRef<string[]>([]);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entities: HAEntity[] = await haFetch('/states');
      const mediaPlayers = entities
        .filter(e => e.entity_id.startsWith('media_player.'))
        .filter(e => !e.attributes.restored)
        .map(e => toDevice(e, castGroupEntityIdsRef.current));
      setDevices(mediaPlayers);
      setConnected(true);
    } catch (e: any) {
      setError(e.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const connectWs = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) return;

    const wsUrl = HA_URL.replace(/^http/, 'ws') + '/api/websocket';
    const ws    = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {};

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);

      if (msg.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: HA_TOKEN }));
        return;
      }

      if (msg.type === 'auth_ok') {
        ws.send(JSON.stringify({
          id: msgIdRef.current++,
          type: 'subscribe_events',
          event_type: 'state_changed',
        }));
        ws.send(JSON.stringify({
          id: msgIdRef.current++,
          type: 'config/device_registry/list',
        }));
        ws.send(JSON.stringify({
          id: msgIdRef.current++,
          type: 'config/entity_registry/list',
        }));
        return;
      }

      if (msg.type === 'result' && Array.isArray(msg.result)) {
        // Device registry — has 'model' field
        if (msg.result[0]?.model !== undefined) {
          castGroupDeviceIdsRef.current = msg.result
            .filter((d: any) => d.model === 'Google Cast Group')
            .map((d: any) => d.id);
        }
        // Entity registry — has 'entity_id' field
        else if (msg.result[0]?.entity_id !== undefined) {
          castGroupEntityIdsRef.current = msg.result
            .filter((e: any) => castGroupDeviceIdsRef.current.includes(e.device_id))
            .map((e: any) => e.entity_id);
          // Re-classify devices now that we know the group entity IDs
          setDevices(prev => prev.map(d => ({
            ...d,
            type: classifyDevice(
              { entity_id: d.id, state: d.state, attributes: d.attributes },
              castGroupEntityIdsRef.current,
            ),
          })));
        }
        return;
      }

      if (msg.type === 'event' && msg.event?.event_type === 'state_changed') {
        const { entity_id, new_state } = msg.event.data;
        if (!entity_id.startsWith('media_player.') || !new_state) return;

        setDevices(prev => {
          const idx     = prev.findIndex(d => d.id === entity_id);
          const updated = toDevice(new_state as HAEntity, castGroupEntityIdsRef.current);
          if (idx === -1) return [...prev, updated];
          const next  = [...prev];
          next[idx]   = updated;
          return next;
        });
      }
    };

    ws.onerror = () => setError('WebSocket error');
    ws.onclose = () => {
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null;
          if (mountedRef.current) connectWs();
        }
      }, 5000);
    };
  }, []);

  useEffect(() => {
    if (!HA_TOKEN) return;
    mountedRef.current = true;

    const timer = setTimeout(() => {
      if (mountedRef.current) connectWs();
    }, 100);

    fetchDevices();

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      const ws = wsRef.current;
      wsRef.current = null;
      ws?.close();
    };
  }, []);

  const play = useCallback((entityId: string) =>
    callService('media_player', 'media_play', { entity_id: entityId }), []);

  const pause = useCallback((entityId: string) =>
    callService('media_player', 'media_pause', { entity_id: entityId }), []);

  const stop = useCallback((entityId: string) =>
    callService('media_player', 'media_stop', { entity_id: entityId }), []);

  const setVolume = useCallback((entityId: string, volume: number) =>
    callService('media_player', 'volume_set', {
      entity_id:    entityId,
      volume_level: Math.max(0, Math.min(1, volume)),
    }), []);

  const mute = useCallback((entityId: string, muted: boolean) =>
    callService('media_player', 'volume_mute', {
      entity_id:       entityId,
      is_volume_muted: muted,
    }), []);

  const playMedia = useCallback((entityId: string, url: string, mediaType = 'music') =>
    callService('media_player', 'play_media', {
      entity_id:          entityId,
      media_content_id:   url,
      media_content_type: mediaType,
    }), []);

  const turnOn = useCallback((entityId: string) =>
    callService('media_player', 'turn_on', { entity_id: entityId }), []);

  const turnOff = useCallback((entityId: string) =>
    callService('media_player', 'turn_off', { entity_id: entityId }), []);

  const joinGroup = useCallback((entityId: string, groupId: string) =>
    callService('media_player', 'join', {
      entity_id:    groupId,
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
    speakers:      devices.filter(d => d.type === 'speaker'),
    speakerGroups: devices.filter(d => d.type === 'speaker_group'),
    tvs:           devices.filter(d => d.type === 'tv'),
    tablets:       devices.filter(d => d.type === 'tablet'),
  };
}