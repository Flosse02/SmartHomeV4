import { useState, useEffect, useRef, useCallback } from 'react';

const BASE = process.env.NEXT_PUBLIC_JELLYFIN_URL ?? '';
const API_KEY = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY ?? '';

export interface JellyfinTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationTicks: number;
  imageUrl: string | null;
}

export interface JellyfinSession {
  id: string;
  deviceName: string;
  appName: string;
  nowPlaying: string | null;
}

interface PlayerState {
  track: JellyfinTrack | null;
  playing: boolean;
  positionTicks: number;
  volume: number;
  sessionId: string | null;
  // browser-only
  browserPlaying: boolean;
  browserTrackId: string | null;
}

function ticksToSeconds(ticks: number) { return ticks / 10_000_000; }
function secondsToTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function useJellyfin() {
  const [state, setState] = useState<PlayerState>({
    track: null, playing: false, positionTicks: 0, volume: 100,
    sessionId: null, browserPlaying: false, browserTrackId: null,
  });
  const [sessions, setSessions] = useState<JellyfinSession[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [browserProgress, setBrowserProgress] = useState(0);
  const [shuffling, setShuffling] = useState(false);

  const onEndedRef = useRef<null | (() => void)>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const setOnEnded = useCallback((fn: () => void) => {
    onEndedRef.current = fn;
  }, []);

  const [browserTime, setBrowserTime] = useState({
    current: 0,
    duration: 0,
  });

  // ── Init audio element ──────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 1;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setBrowserProgress(audio.currentTime / audio.duration);
      }
    };

    const handleEnded = () => {
      setState(p => ({ ...p, browserPlaying: false }));

      // 👇 single source of truth
      onEndedRef.current?.();
    };

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;

      setBrowserProgress(audio.currentTime / audio.duration);

      setBrowserTime({
        current: audio.currentTime,
        duration: audio.duration,
      });
    });
    audio.addEventListener('ended', () => {
      setState(p => ({ ...p, browserPlaying: false }));
      setBrowserTime({ current: 0, duration: 0 });
      onEndedRef.current?.();
    });

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // ── Enumerate audio output devices ─────────────────────────────────────
  const loadAudioDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      setAudioDevices(outputs);
    } catch {
      setAudioDevices([]);
    }
  }, []);

  const selectOutputDevice = useCallback(async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    const audio = audioRef.current;
    if (!audio) return;
    if (typeof (audio as any).setSinkId === 'function') {
      try {
        await (audio as any).setSinkId(deviceId);
      } catch (e) {
        console.warn('setSinkId failed:', e);
      }
    }
  }, []);

  // ── Poll Jellyfin sessions ──────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/Sessions?api_key=${API_KEY}`);
      if (!res.ok) { setError('Cannot reach Jellyfin'); return; }
      const data: any[] = await res.json();

      // Expose all sessions for remote control
      setSessions(data.map(s => ({
        id: s.Id,
        deviceName: s.DeviceName ?? s.Client ?? 'Unknown device',
        appName: s.AppName ?? '',
        nowPlaying: s.NowPlayingItem?.Name ?? null,
      })));

      // Find active session (prefer one that's playing)
      const active = data.find(s => s.NowPlayingItem);
      if (!active) {
        setState(p => ({ ...p, track: null, playing: false }));
        setError(null);
        return;
      }

      const item = active.NowPlayingItem;
      const ps   = active.PlayState;

      setState(p => ({
        ...p,
        sessionId: active.Id,
        playing: !ps.IsPaused,
        positionTicks: ps.PositionTicks ?? 0,
        volume: ps.VolumeLevel ?? 100,
        track: {
          id: item.Id,
          title: item.Name ?? 'Unknown',
          artist: item.AlbumArtist ?? item.Artists?.[0] ?? item.SeriesName ?? 'Unknown',
          album: item.Album ?? '',
          durationTicks: item.RunTimeTicks ?? 0,
          imageUrl: item.Id
            ? `${BASE}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}&maxHeight=80&quality=80`
            : null,
        },
      }));
      setError(null);
    } catch {
      setError('Cannot reach Jellyfin');
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    pollRef.current = setInterval(fetchSessions, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchSessions]);

  // ── Remote session commands ─────────────────────────────────────────────
  const sendCommand = useCallback(async (command: string, targetSessionId?: string) => {
    const sid = targetSessionId ?? state.sessionId;
    if (!sid) return;
    await fetch(`${BASE}/Sessions/${sid}/Playing/${command}?api_key=${API_KEY}`, {
      method: 'POST',
      headers: { 'X-Emby-Token': API_KEY, 'Content-Type': 'application/json' },
    });
    setTimeout(fetchSessions, 500);
  }, [state.sessionId, fetchSessions]);

  // ── Play a specific item on a remote session ────────────────────────────
  const playOnSession = useCallback(async (itemId: string, sessionId: string) => {
    await fetch(
      `${BASE}/Sessions/${sessionId}/Playing?api_key=${API_KEY}&playCommand=PlayNow&itemIds=${itemId}`,
      {
        method: 'POST',
        headers: { 'X-Emby-Token': API_KEY, 'Content-Type': 'application/json' },
      }
    );
    setTimeout(fetchSessions, 800);
  }, [fetchSessions]);

  // ── Browser playback ────────────────────────────────────────────────────
  const playInBrowser = useCallback(async (itemId: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    const streamUrl =
      `${BASE}/Audio/${itemId}/stream?api_key=${API_KEY}&audioCodec=mp3&static=true`;

    // 🧼 kill previous playback cleanly
    audio.pause();
    audio.src = '';
    audio.load();

    // optional sink switching
    if (selectedDeviceId && typeof (audio as any).setSinkId === 'function') {
      try {
        await (audio as any).setSinkId(selectedDeviceId);
      } catch {}
    }

    audio.src = streamUrl;
    audio.load();

    try {
      await audio.play();
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      throw e;
    }

    setState(p => ({
      ...p,
      browserPlaying: true,
      browserTrackId: itemId,
    }));

    setBrowserProgress(0);
  }, [selectedDeviceId]);

  const pauseBrowser  = useCallback(() => { audioRef.current?.pause(); setState(p => ({ ...p, browserPlaying: false })); }, []);
  const resumeBrowser = useCallback(() => { audioRef.current?.play();  setState(p => ({ ...p, browserPlaying: true  })); }, []);
  const stopBrowser   = useCallback(() => {
    const a = audioRef.current;
    if (a) { a.pause(); a.src = ''; }
    setState(p => ({ ...p, browserPlaying: false, browserTrackId: null }));
    setBrowserProgress(0);
  }, []);

  const setBrowserVolume = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = v / 100;
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────
  const durationSecs = ticksToSeconds(state.track?.durationTicks ?? 0);
  const positionSecs = ticksToSeconds(state.positionTicks);

  const fetchShuffleTracks = useCallback(async (limit = 20) => {
    setShuffling(true);
    try {
      const res = await fetch(
        `${BASE}/Items?IncludeItemTypes=Audio&Recursive=true&SortBy=Random&Limit=${limit}&api_key=${API_KEY}`
      );
      const data = await res.json();
      return (data.Items ?? []) as any[];
    } finally {
      setShuffling(false);
    }
  }, []);

  const seekBrowser = useCallback((ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;

    audio.currentTime = ratio * audio.duration;
  }, []);


  return {
    // remote state
    track: state.track,
    playing: state.playing,
    volume: state.volume,
    progress: durationSecs > 0 ? positionSecs / durationSecs : 0,
    elapsed: secondsToTime(browserTime.current),
    duration: secondsToTime(browserTime.duration),
    browserElapsed: secondsToTime(browserTime.current),
    browserDuration: secondsToTime(browserTime.duration),
    sessionId: state.sessionId,
    sessions,
    error,
    // remote controls
    play:     () => sendCommand('Unpause'),
    pause:    () => sendCommand('Pause'),
    next:     () => sendCommand('NextTrack'),
    previous: () => sendCommand('PreviousTrack'),
    playOnSession,
    // browser playback
    browserPlaying: state.browserPlaying,
    browserTrackId: state.browserTrackId,
    browserProgress,
    playInBrowser,
    pauseBrowser,
    resumeBrowser,
    stopBrowser,
    setBrowserVolume,
    // audio devices
    audioDevices,
    selectedDeviceId,
    loadAudioDevices,
    selectOutputDevice,
    shuffling,
    fetchShuffleTracks,
    setOnEnded,
    seekBrowser,
  };
}