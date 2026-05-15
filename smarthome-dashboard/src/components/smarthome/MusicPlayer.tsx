'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useJellyfinLibrary, JellyfinItem } from '@/hooks/useJellyFinLibrary';
import { useQueue } from '@/hooks/useQueue';
import { SmartDevice, useDevices, BROWSER_DEVICE } from '@/hooks/useDevices';
import { CastIcon, PlayIcon, PauseIcon, FastForwardIcon, FastRewindIcon, ShuffleIcon, StopIcon, RefreshIcon, VolumeHighIcon, VolumeMuteIcon, VolumeVeryLowIcon, VolumeLowIcon } from '@/lib/icons';

const BASE    = process.env.NEXT_PUBLIC_JELLYFIN_URL     ?? '';
const API_KEY = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY ?? '';

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return '--:--';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function CtrlButton({ children, onClick, accent, disabled, style }: {
  children: React.ReactNode; onClick: () => void;
  accent?: boolean; disabled?: boolean; style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'none', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: accent ? '18px' : '13px',
        color: accent ? 'var(--accent)' : 'var(--text-secondary)',
        opacity: disabled ? 0.3 : 1,
        padding: '2px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', transition: 'opacity 0.15s', ...style,
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.opacity = '0.7')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  );
}

function VolumeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const prevVolumeRef = useRef(value > 0 ? value : 1);

  const handleMuteToggle = () => {
    if (value > 0) {
      prevVolumeRef.current = value;
      onChange(0);
    } else {
      onChange(prevVolumeRef.current);
    }
  };

  return (
    <div style={{
      position: 'absolute', bottom: '110%', right: 0, zIndex: 100,
      background: 'var(--card-bg, #1e1e2e)', borderRadius: 8, padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 44,
    }}>
      <span style={{ fontSize: 10, width: 28, color: 'var(--text-muted)' }}>{Math.round(value * 100)}%</span>
      <input
        type="range" min={0} max={1} step={0.01} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 80, cursor: 'pointer', accentColor: 'var(--accent)' }}
      />
      <button
        onClick={handleMuteToggle}
        style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
        {value > 0 && value <= 0.1 ? <VolumeVeryLowIcon /> : value > 0.1 && value < 0.5 ? <VolumeLowIcon /> : value > 0.5 ? <VolumeHighIcon/> : <VolumeMuteIcon />}
      </button>
    </div>
  );
}

function ProgressBar({ progress, onSeek }: { progress: number; onSeek: (r: number) => void }) {
  const ref      = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const ratio = (e: PointerEvent | React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
  };

  useEffect(() => {
    const move = (e: PointerEvent) => { if (dragging.current) onSeek(ratio(e)); };
    const up   = ()               => { dragging.current = false; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup',   up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [onSeek]);

  return (
    <div ref={ref} onPointerDown={e => { dragging.current = true; onSeek(ratio(e)); }}
      style={{ height: 12, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
      <div style={{ height: 2, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 1, position: 'relative' }}>
        <div style={{ height: '100%', width: `${Math.min((progress ?? 0) * 100, 100)}%`, background: 'var(--accent)', borderRadius: 1, transition: dragging.current ? 'none' : 'width 0.2s linear' }} />
      </div>
    </div>
  );
}

function DevicePicker({ devices, selectedDevice, onSelect, onClose }: {
  devices: ReturnType<typeof useDevices>;
  selectedDevice: SmartDevice;
  onSelect: (d: SmartDevice) => void;
  onClose: () => void;
}) {
  const all = devices.devices;
  return (
    <div style={{
      position: 'absolute', top: '110%', right: 0, zIndex: 100,
      background: 'var(--card-bg, #1e1e2e)', borderRadius: 8, padding: 12,
      minWidth: 240, maxWidth: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cast</span>
        <button onClick={devices.discover} style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', gap: 4 }}>
          {devices.discovering ? '…' : <RefreshIcon />}
        </button>
      </div>
      {devices.discoverError && (
        <div style={{ fontSize: 11, color: 'var(--color-text-danger)', padding: '4px 8px' }}>{devices.discoverError}</div>
      )}
      {all.map(d => (
        <div key={d.id} onClick={() => { onSelect(d); onClose(); }} style={{
          fontSize: 11, padding: '5px 8px', borderRadius: 4, cursor: 'pointer',
          background: selectedDevice.id === d.id ? 'rgba(255,255,255,0.1)' : 'transparent',
          color: selectedDevice.id === d.id ? 'var(--text-primary)' : 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{selectedDevice.id === d.id ? '✓' : '○'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
            {d.ip && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.ip}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function QueueRow({ track, index, isCurrent, isDragging, onPointerDown, onPlayIndex, onRemove, imageUrl }: any) {
  return (
    <div
      data-queue-row
      onPointerDown={e => onPointerDown(e, index)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 16px', userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.4 : 1,
        background: isCurrent ? 'rgba(255,255,255,0.07)' : 'transparent',
        borderLeft: isCurrent ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      {imageUrl(track) ? (
        <img src={imageUrl(track)!} style={{ width: 30, height: 30, borderRadius: 3 }} />
      ) : (
        <div style={{ width: 30, height: 30, borderRadius: 3, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎵</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }} onClick={() => onPlayIndex(index)}>
        <div style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }}>
          {track.Name}
        </div>
      </div>
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onRemove(track.queueId)}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
      >✕</button>
    </div>
  );
}

function QueuePanel({ queue, currentIndex, onMove, onRemove, onPlayIndex, imageUrl, onClear }: any) {
  const listRef     = useRef<HTMLDivElement | null>(null);
  const dragIdxRef  = useRef<number | null>(null);
  const hoverIdxRef = useRef<number | null>(null);
  const curIdxRef   = useRef(currentIndex);
  const onMoveRef   = useRef(onMove);

  useEffect(() => { curIdxRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);

  const [dragIdx,  setDragIdx]  = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const rowAtY = (y: number) => {
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-queue-row]') ?? []);
    for (let i = 0; i < rows.length; i++) {
      if (y < rows[i].getBoundingClientRect().top + rows[i].getBoundingClientRect().height / 2) return i;
    }
    return rows.length;
  };

  const moveRef = useRef<(e: PointerEvent) => void>(() => {});
  const upRef   = useRef<(e: PointerEvent) => void>(() => {});

  moveRef.current = (e: PointerEvent) => {
    if (dragIdxRef.current === null) return;
    const idx = rowAtY(e.clientY);
    hoverIdxRef.current = idx;
    setHoverIdx(idx);
  };

  upRef.current = () => {
    const from = dragIdxRef.current, to = hoverIdxRef.current;
    if (from !== null && to !== null && from !== to)
      onMoveRef.current(curIdxRef.current + from, curIdxRef.current + to);
    dragIdxRef.current = hoverIdxRef.current = null;
    setDragIdx(null); setHoverIdx(null);
  };

  useEffect(() => {
    const m = (e: PointerEvent) => moveRef.current(e);
    const u = (e: PointerEvent) => upRef.current(e);
    document.addEventListener('pointermove', m);
    document.addEventListener('pointerup',   u);
    return () => { document.removeEventListener('pointermove', m); document.removeEventListener('pointerup', u); };
  }, []);

  const startDrag = (e: React.PointerEvent, i: number) => {
    e.preventDefault();
    dragIdxRef.current = hoverIdxRef.current = i;
    setDragIdx(i); setHoverIdx(i);
  };

  const visible = queue.slice(currentIndex);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {visible.length > 0 && (
        <div style={{ padding: '6px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClear} style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Clear</button>
        </div>
      )}
      <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
        {visible.map((track: any, i: number) => (
          <div key={track.queueId}>
            {hoverIdx === i && dragIdx !== null && <div style={{ height: 2, background: 'var(--accent)', margin: '0 16px' }} />}
            <QueueRow
              track={track} index={i} isCurrent={i === 0} isDragging={dragIdx === i}
              onPointerDown={startDrag}
              onPlayIndex={(ui: number) => onPlayIndex(currentIndex + ui)}
              onRemove={onRemove} imageUrl={imageUrl}
            />
          </div>
        ))}
        {hoverIdx === visible.length && dragIdx !== null && <div style={{ height: 2, background: 'var(--accent)', margin: '0 16px' }} />}
      </div>
    </div>
  );
}

function BrowsePanel({ open, onClose, lib, queue }: {
  open: boolean; onClose: () => void;
  lib: ReturnType<typeof useJellyfinLibrary>;
  queue: ReturnType<typeof useQueue>;
}) {
  const [query, setQuery] = useState('');
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (val: string) => {
    setQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => lib.search(val), 350);
  };

  const handleAlbumClick = async (item: JellyfinItem) => {
    if (item.Type === 'MusicAlbum') {
      await lib.getAlbumTracks(item.Id);
    } else {
      queue.playNow(item);
    }
  };

  const addAlbumToQueue = async (item: JellyfinItem, e: React.MouseEvent, front = false) => {
    e.stopPropagation();
    if (item.Type === 'MusicAlbum') {
      const res  = await fetch(`${BASE}/Items?ParentId=${item.Id}&IncludeItemTypes=Audio&Recursive=true&SortBy=IndexNumber&api_key=${API_KEY}`);
      const data = await res.json();
      front ? queue.addNext(data.Items ?? []) : queue.addManyToQueue(data.Items ?? []);
    } else {
      front ? queue.addNext([item]) : queue.addToQueue(item);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 149, background: 'rgba(0,0,0,0.4)', opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none', transition: 'opacity 0.25s' }} />
      <div style={{
        position: 'fixed', top: '5%', right: '5%', bottom: '5%', left: '5%', zIndex: 150,
        background: 'var(--card-bg, #1a1a2e)',
        border: '1px solid rgba(255,255,255,0.08)', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', borderRadius: 8,
        transform: open ? 'scale(1)' : 'scale(0.98)',
        opacity: open ? 1 : 0, transition: 'transform 0.2s ease, opacity 0.2s ease',
        pointerEvents: open ? 'auto' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>Browse</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>✕</button>
        </div>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', gap: 8 }}>
          <input
            placeholder="Search tracks, artists, albums…"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '7px 10px', color: 'inherit', fontSize: 13 }}
          />
          <button onClick={() => { setQuery(''); lib.getAlbums(); }} style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, padding: '0 10px', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>Albums</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {lib.loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>}
          {!lib.loading && lib.results.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Search for music or tap Albums</div>}
          {lib.results.map(item => (
            <div key={item.Id}
              onClick={() => handleAlbumClick(item)}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
            >
              {lib.imageUrl(item)
                ? <img src={lib.imageUrl(item)!} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 40, height: 40, borderRadius: 4, background: 'rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{item.Type === 'MusicAlbum' ? '💿' : '🎵'}</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.Name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.AlbumArtist ?? item.Artists?.[0] ?? ''}{item.Album && item.Type !== 'MusicAlbum' ? ` — ${item.Album}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                <button onClick={e => addAlbumToQueue(item, e)} title="Add to end of queue" style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 4, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, padding: '3px 6px' }}>+Q</button>
                <button onClick={e => addAlbumToQueue(item, e, true)} title="Play next" style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 4, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, padding: '3px 6px' }}>+F</button>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.Type === 'MusicAlbum' ? '▸' : lib.ticksToTime(item.RunTimeTicks)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function MusicPlayer() {
  const [, forceRender] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceRender(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const queueRef = useRef<typeof queue | null>(null);

  const devices = useDevices();
  const lib     = useJellyfinLibrary();

  const [selectedDevice,   setSelectedDevice]   = useState<SmartDevice>(BROWSER_DEVICE);
  const [showPanel,        setShowPanel]        = useState(false);
  const [showDevices,      setShowDevices]      = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volume,           setVolume]           = useState(1);
  const [shuffleActive,    setShuffleActive]    = useState(false);

  const SHUFFLE_AHEAD  = 10;
  const shufflePoolRef = useRef<JellyfinItem[]>([]);
  const shuffleModeRef = useRef(false);
  const pendingAddRef  = useRef(0);

  const selectedDeviceRef = useRef(selectedDevice);
  useEffect(() => { selectedDeviceRef.current = selectedDevice; }, [selectedDevice]);

  // Sync volume state when switching devices
  useEffect(() => {
    if (selectedDevice.type === 'browser') {
      setVolume(devices.audioRef.current?.volume ?? 1);
    } else {
      const pb = devices.playback[selectedDevice.location];
      setVolume(pb?.volume ?? 1);
    }
  }, [selectedDevice]);


  const handleVolume = useCallback((v: number) => {
    setVolume(v);
    if (selectedDevice.type === 'browser') {
      if (devices.audioRef.current) devices.audioRef.current.volume = v;
    } else {
      devices.setVolume(selectedDevice, v);
    }
  }, [selectedDevice, devices]);

  const playTrack = useCallback(async (itemId: string) => {
    const item = queueRef.current?.queue.find(t => t.Id === itemId);
    const duration = item?.RunTimeTicks ? item.RunTimeTicks / 10_000_000 : undefined;
    await devices.playOnDevice(selectedDeviceRef.current, itemId, duration);
  }, [devices]);

  const stopAll = useCallback(() => {
    devices.stopBrowser();
  }, [devices]);

  const queue = useQueue(playTrack, undefined, stopAll);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  const prevDeviceRef = useRef<SmartDevice>(BROWSER_DEVICE);

  useEffect(() => {
    const prev = prevDeviceRef.current;
    prevDeviceRef.current = selectedDevice;

    const current = queueRef.current?.queue[queueRef.current?.currentIndex];
    if (!current) return;
    if (prev.id === selectedDevice.id) return;

    const position = prev.type === 'browser'
      ? devices.audioRef.current?.currentTime ?? 0
      : livePosition;

    const duration = current.RunTimeTicks ? current.RunTimeTicks / 10_000_000 : undefined;

    devices.pauseDevice(prev);
    devices.playOnDevice(selectedDevice, current.Id, duration, position);
  }, [selectedDevice]);

  const topUpQueue = useCallback(() => {
    if (!shuffleModeRef.current) return;
    const ahead  = (queue.queue.length + pendingAddRef.current) - (queue.currentIndex + 1);
    const needed = SHUFFLE_AHEAD - ahead;
    if (needed <= 0) return;
    const toAdd = shufflePoolRef.current.splice(0, needed);
    if (!toAdd.length) return;
    pendingAddRef.current += toAdd.length;
    queue.addManyToQueue(toAdd);
  }, [queue]);

  useEffect(() => { pendingAddRef.current = 0; }, [queue.queue.length]);
  useEffect(() => { topUpQueue(); }, [queue.currentIndex, topUpQueue]);

  const handleShuffle = async () => {
    const res = await fetch(`${BASE}/Items?IncludeItemTypes=Audio&Recursive=true&Limit=50&SortBy=Random&api_key=${API_KEY}`);
    const data = await res.json();
    const tracks: JellyfinItem[] = data.Items ?? [];
    if (!tracks.length) return;

    const shuffled = tracks
      .sort(() => Math.random() - 0.5)
      .map(t => ({ ...t, queueId: `${t.Id}-${Date.now()}-${Math.random()}` }));

    shufflePoolRef.current = shuffled.slice(SHUFFLE_AHEAD);
    shuffleModeRef.current = true;
    pendingAddRef.current  = 0;

    queue.clearQueue();
    requestAnimationFrame(() => {
      queue.addManyToQueue(shuffled.slice(0, SHUFFLE_AHEAD));
      requestAnimationFrame(() => { queue.playIndex(0); });
    });
    setShuffleActive(true);
  };

  const pb          = devices.playback[selectedDevice.location] ?? { playing: false, position: 0, duration: 0, updatedAt: 0, positionFetchedAt: 0 };
  const isPlaying   = pb.playing;
  const activeTrack = queue.currentIndex >= 0 ? queue.queue[queue.currentIndex] : null;

  const livePosition = pb.playing && selectedDevice.type === 'renderer'
    ? pb.position + (Date.now() - pb.positionFetchedAt) / 1000
    : pb.playing && selectedDevice.type === 'browser'
    ? pb.position + (Date.now() - pb.updatedAt) / 1000
    : pb.position;

  const progress = pb.duration > 0 ? Math.min(livePosition / pb.duration, 1) : 0;

  const handlePlayPause = async () => {
    isPlaying ? await devices.pauseDevice(selectedDevice) : await devices.resumeDevice(selectedDevice);
  };

  return (
    <>
      <BrowsePanel open={showPanel} onClose={() => setShowPanel(false)} lib={lib} queue={queue} />

      <div style={{ display: 'flex', width: '100%', height: '100%' }}>

        {/* ── PLAYER ── */}
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setShowPanel(true)} style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, padding: '3px 8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Browse
            </button>
            <button onClick={handleShuffle} style={{
              fontSize: 11,
              background: shuffleActive ? 'rgba(var(--accent-rgb,99,102,241),0.2)' : 'rgba(255,255,255,0.06)',
              border: shuffleActive ? '1px solid var(--accent)' : 'none',
              borderRadius: 6, padding: '3px 8px',
              color: shuffleActive ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}><ShuffleIcon/>Shuffle</button>
          </div>

          {/* Track info */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{activeTrack?.Name ?? 'Nothing playing'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{activeTrack?.AlbumArtist ?? activeTrack?.Artists?.[0] ?? ''}</div>
          </div>

          {/* Progress */}
          <ProgressBar progress={progress} onSeek={ratio => devices.seekDevice(selectedDevice, ratio)} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{formatTime(livePosition)}</span>
            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{formatTime(pb.duration)}</span>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <CtrlButton onClick={() => queue.playPrev()}><FastRewindIcon/></CtrlButton>
            <CtrlButton onClick={handlePlayPause} accent>{isPlaying ? <PauseIcon/> : <PlayIcon/>}</CtrlButton>
            <CtrlButton onClick={() => queue.playNext()}><FastForwardIcon/></CtrlButton>
            {selectedDevice.type === 'browser' && (
              <CtrlButton onClick={devices.stopBrowser}><StopIcon/></CtrlButton>
            )}

            {/* Volume + Device picker */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>

              {/* Device picker */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                {selectedDevice.id !== 'browser' && (
                  <span style={{ fontSize: 10, color: 'var(--accent)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedDevice.name}
                  </span>
                )}
                <CtrlButton onClick={() => { setShowDevices(v => !v); devices.discover(); }}><CastIcon/></CtrlButton>
                {showDevices && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowDevices(false)} />
                    <DevicePicker
                      devices={devices}
                      selectedDevice={selectedDevice}
                      onSelect={setSelectedDevice}
                      onClose={() => setShowDevices(false)}
                    />
                  </>
                )}
              </div>

              {/* Volume */}
              <div style={{ position: 'relative' }}>
                <CtrlButton onClick={() => setShowVolumeSlider(v => !v)}>{volume > 0 && volume <= 0.1 ? <VolumeVeryLowIcon /> : volume > 0.1 && volume < 0.5 ? <VolumeLowIcon /> : volume > 0.5 ? <VolumeHighIcon/> : <VolumeMuteIcon />}</CtrlButton>
                {showVolumeSlider && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowVolumeSlider(false)} />
                    <VolumeSlider value={volume} onChange={handleVolume} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── QUEUE ── */}
        {queue.queue.length > 0 && (
          <div style={{ width: 320 }}>
            <QueuePanel
              queue={queue.queue}
              currentIndex={queue.currentIndex}
              onMove={queue.move}
              onRemove={queue.removeFromQueue}
              onPlayIndex={queue.playIndex}
              onClear={queue.clearQueue}
              imageUrl={lib.imageUrl}
            />
          </div>
        )}
      </div>
    </>
  );
}