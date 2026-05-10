'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useJellyfin } from '@/hooks/useJellyFin';
import { useJellyfinLibrary, JellyfinItem } from '@/hooks/useJellyFinLibrary';
import { useQueue, QueueTrack} from '@/hooks/useQueue';
import { SmartDevice, useDevices } from '@/hooks/useDevices';

const BASE = process.env.NEXT_PUBLIC_JELLYFIN_URL ?? '';
const API_KEY = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY ?? '';

// ── Helpers ─────────────────────────────────────────────────────────────────

function CtrlButton({ children, onClick, accent, disabled, active, style }: {
  children: React.ReactNode; onClick: () => void;
  accent?: boolean; disabled?: boolean; active?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: 'none', border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: accent ? '18px' : '13px',
      color: active ? 'var(--accent)' : accent ? 'var(--accent)' : 'var(--text-secondary)',
      opacity: disabled ? 0.3 : 1,
      padding: '2px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', transition: 'opacity 0.15s', ...style,
    }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.opacity = '0.7')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.opacity = '1')}
    >{children}</button>
  );
}

function ProgressBar({
  progress,
  onSeek,
}: {
  progress: number;
  onSeek: (ratio: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);

  const getRatio = (e: PointerEvent | React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 0;

    let x = e.clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));

    return x / rect.width;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    const ratio = getRatio(e);
    onSeek(ratio);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging.current) return;
    const ratio = getRatio(e);
    onSeek(ratio);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  return (
    <div
      ref={ref}
      onPointerDown={handlePointerDown}
      style={{
        height: '12px',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
      }}
    >
      <div style={{
        height: '2px',
        width: '100%',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '1px',
        position: 'relative',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min((progress ?? 0) * 100, 100)}%`,
          background: 'var(--accent)',
          borderRadius: '1px',
          transition: isDragging.current ? 'none' : 'width 0.2s linear',
        }} />
      </div>
    </div>
  );
}

// ── Device Picker ────────────────────────────────────────────────────────────

function DevicePicker({
  jellyfin,
  devices,
  selectedDevice,
  onSelectDevice,
  onClose,
}: {
  jellyfin: ReturnType<typeof useJellyfin>;
  devices: ReturnType<typeof useDevices>;
  selectedDevice: SmartDevice | null;
  onSelectDevice: (d: SmartDevice | null) => void;
  onClose: () => void;
}) {
  const { audioDevices, selectedDeviceId, selectOutputDevice, loadAudioDevices } = jellyfin;

  return (
    <div style={{
      position: 'absolute', top: '110%', right: 0, zIndex: 100,
      background: 'var(--card-bg, #1e1e2e)', borderRadius: 8, padding: '12px',
      minWidth: 240, maxWidth: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>

      {/* Browser audio outputs */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Browser Output
        </div>
        {audioDevices.length === 0 ? (
          <button onClick={loadAudioDevices} style={{
            fontSize: '11px', color: 'var(--accent)', background: 'none',
            border: '1px solid var(--accent)', borderRadius: 4,
            padding: '4px 10px', cursor: 'pointer', width: '100%',
          }}>Allow & detect devices</button>
        ) : audioDevices.map(d => (
          <div key={d.deviceId} onClick={() => { selectOutputDevice(d.deviceId); onSelectDevice(null); onClose(); }} style={{
            fontSize: '11px', padding: '5px 8px', borderRadius: 4, cursor: 'pointer',
            background: selectedDeviceId === d.deviceId && !selectedDevice ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: selectedDeviceId === d.deviceId && !selectedDevice ? 'var(--text-primary)' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{selectedDeviceId === d.deviceId && !selectedDevice ? '✓' : '○'}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.label || 'Default'}
            </span>
          </div>
        ))}
      </div>

      {/* Smart / UPnP devices */}
      <div>
        <div style={{
          fontSize: '10px', color: 'var(--text-muted)', marginBottom: 6,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Network Speakers</span>
          <button onClick={devices.discover} style={{
            fontSize: '10px', background: 'none', border: 'none',
            color: 'var(--accent)', cursor: 'pointer', padding: 0,
          }}>
            {devices.loading ? '…' : '↺ Scan'}
          </button>
        </div>

        {devices.error && (
          <div style={{ fontSize: '11px', color: 'var(--color-text-danger)', padding: '4px 8px' }}>
            {devices.error}
          </div>
        )}

        {devices.devices.length === 0 && !devices.loading && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 8px' }}>
            No devices found — press Scan
          </div>
        )}

        {devices.devices
          .filter(d => d.type === 'renderer')
          .map(d => (
            <div key={d.id} onClick={() => { onSelectDevice(d); onClose(); }} style={{
              fontSize: '11px', padding: '5px 8px', borderRadius: 4, cursor: 'pointer',
              background: selectedDevice?.id === d.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: selectedDevice?.id === d.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{selectedDevice?.id === d.id ? '✓' : '○'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.name}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{d.ip}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Queue Panel ──────────────────────────────────────────────────────────────
function QueueRow({
  track,
  index,
  isCurrent,
  isDragging,
  onPointerDown,
  onPlayIndex,
  onRemove,
  imageUrl,
}: any) {
  return (
    <div
      data-queue-row
      onPointerDown={(e) => onPointerDown(e, index)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 16px',
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.4 : 1,
        background: isCurrent ? 'rgba(255,255,255,0.07)' : 'transparent',
        borderLeft: isCurrent
          ? '2px solid var(--accent)'
          : '2px solid transparent',
      }}
    >
      {imageUrl(track) ? (
        <img
          src={imageUrl(track)!}
          style={{ width: 30, height: 30, borderRadius: 3 }}
        />
      ) : (
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          🎵
        </div>
      )}

      <div style={{ flex: 1 }} onClick={() => onPlayIndex(index)}>
        <div
          style={{
            fontSize: 12,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: isCurrent ? 'var(--accent)' : 'var(--text-primary)',
          }}
        >
          {track.Name}
        </div>
      </div>

      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(track.queueId)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );
}

function QueuePanel({ queue, currentIndex, onRemove, onMove, onPlayIndex, imageUrl }: any) {
  const listRef = useRef<HTMLDivElement | null>(null);

  const dragIndexRef  = useRef<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  const [dragIndex,  setDragIndex]  = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const onMoveRef = useRef(onMove);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);

  const getIndexFromY = (y: number) => {
    if (!listRef.current) return 0;
    const rows = Array.from(
      listRef.current.querySelectorAll<HTMLElement>('[data-queue-row]')
    );
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      if (y < rect.top + rect.height / 2) return i;
    }
    return rows.length;
  };

  const handlePointerMoveRef = useRef<(e: PointerEvent) => void>(() => {});
  const handlePointerUpRef   = useRef<(e: PointerEvent) => void>(() => {});

  handlePointerMoveRef.current = (e: PointerEvent) => {
    if (dragIndexRef.current === null) return;
    const idx = getIndexFromY(e.clientY);
    hoverIndexRef.current = idx;
    setHoverIndex(idx);
  };

  handlePointerUpRef.current = () => {
    const from = dragIndexRef.current;
    const to   = hoverIndexRef.current;
    if (from !== null && to !== null && from !== to) {
      onMoveRef.current(currentIndexRef.current + from, currentIndexRef.current + to);
    }
    dragIndexRef.current  = null;
    hoverIndexRef.current = null;
    setDragIndex(null);
    setHoverIndex(null);
  };

  useEffect(() => {
    const move = (e: PointerEvent) => handlePointerMoveRef.current(e);
    const up   = (e: PointerEvent) => handlePointerUpRef.current(e);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup',   up);
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup',   up);
    };
  }, []);

  const startDrag = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    dragIndexRef.current  = index;
    hoverIndexRef.current = index;
    setDragIndex(index);
    setHoverIndex(index);
  };

  const visible = queue.slice(currentIndex);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
        {visible.map((track: any, i: number) => {
          const isCurrent = (currentIndex + i) === currentIndex; // i === 0

          return (
            <div key={track.queueId}>
              {hoverIndex === i && dragIndex !== null && (
                <div style={{ height: 2, background: 'var(--accent)', margin: '0 16px' }} />
              )}
              <QueueRow
                track={track}
                index={i}
                isCurrent={isCurrent}
                isDragging={dragIndex === i}
                onPointerDown={startDrag}
                onPlayIndex={(uiIndex: number) => onPlayIndex(currentIndex + uiIndex)}
                onRemove={onRemove}
                imageUrl={imageUrl}
              />
            </div>
          );
        })}
        {hoverIndex === visible.length && dragIndex !== null && (
          <div style={{ height: 2, background: 'var(--accent)', margin: '0 16px' }} />
        )}
      </div>
    </div>
  );
}

// ── Side Panel (Browser + Queue) ─────────────────────────────────────────────

function SidePanel({ open, onClose, jellyfin, queue: q, lib }: {
  open: boolean;
  onClose: () => void;
  jellyfin: ReturnType<typeof useJellyfin>;
  queue: ReturnType<typeof useQueue>;
  lib: ReturnType<typeof useJellyfinLibrary>;
}) {
  const [tab, setTab] = useState<'browse'>('browse');
  const [query, setQuery] = useState('');
  const [targetMode, setTargetMode] = useState<'browser' | string>('browser');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (val: string) => {
    setQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => lib.search(val), 350);
  };

  const handlePlay = async (item: JellyfinItem) => {
    if (targetMode === 'browser') {
      await q.playNow(item);
    } else {
      await jellyfin.playOnSession(item.Id, targetMode);
    }
  };

  const handleAddToQueue = (item: JellyfinItem, e: React.MouseEvent) => {
    e.stopPropagation();
    q.addToQueue(item);
  };

  const handleAlbumClick = async (item: JellyfinItem) => {
    if (item.Type === 'MusicAlbum') {
      await lib.getAlbumTracks(item.Id);
    } else {
      await handlePlay(item);
    }
  };

  const handleAddAlbumToQueue = async (item: JellyfinItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.Type === 'MusicAlbum') {
      // fetch tracks then add all
      const res = await fetch(`${BASE}/Items?ParentId=${item.Id}&IncludeItemTypes=Audio&Recursive=true&SortBy=IndexNumber&api_key=${API_KEY}`);
      const data = await res.json();
      q.addManyToQueue(data.Items ?? []);
    } else {
      q.addToQueue(item);
    }
  };

  const handleAddAlbumToFrontQueue = async (item: JellyfinItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.Type === 'MusicAlbum') {
      // fetch tracks then add all
      const res = await fetch(`${BASE}/Items?ParentId=${item.Id}&IncludeItemTypes=Audio&Recursive=true&SortBy=IndexNumber&api_key=${API_KEY}`);
      const data = await res.json();
      q.addNext(data.Items ?? []);
    } else {
      q.addNext([item]);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 149,
        background: 'rgba(0,0,0,0.4)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
        transition: 'opacity 0.25s',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '5%', right: '5%', bottom: '5%', left: '5%', zIndex: 150,
        background: 'var(--card-bg, #1a1a2e)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'scale(1)' : 'scale(0.98)',
        opacity: open ? 1 : 0,
        transition: 'transform 0.2s ease, opacity 0.2s ease',
        pointerEvents: open ? 'auto' : 'none',
      }}>

        {/* Panel header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <button onClick={() => setTab('browse')} style={{
            flex: 1, padding: '6px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: tab === 'browse' ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: tab === 'browse' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: '13px', fontWeight: tab === 'browse' ? 600 : 400,
          }}>Browse</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>✕</button>
        </div>

        {tab === 'browse' ? (
          <>
            {/* Search bar */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', gap: 8 }}>
              <input
                placeholder="Search tracks, artists, albums…"
                value={query}
                onChange={e => handleSearch(e.target.value)}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                  padding: '7px 10px', color: 'inherit', fontSize: '13px',
                }}
              />
              <button onClick={() => { setQuery(''); lib.getAlbums(); }} style={{
                fontSize: '11px', background: 'rgba(255,255,255,0.06)', border: 'none',
                borderRadius: 6, padding: '0 10px', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>Albums</button>
            </div>

            {/* Results */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {lib.loading && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>Loading…</div>
              )}
              {!lib.loading && lib.results.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Search for music or tap Albums
                </div>
              )}
              {lib.results.map(item => (
                <div key={item.Id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 16px', cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.1s',
                }}
                  onClick={() => handleAlbumClick(item)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {lib.imageUrl(item) ? (
                    <img src={lib.imageUrl(item)!} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 4, background: 'rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {item.Type === 'MusicAlbum' ? '💿' : '🎵'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.Name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.AlbumArtist ?? item.Artists?.[0] ?? ''}{item.Album && item.Type !== 'MusicAlbum' ? ` — ${item.Album}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                    <button onClick={e => handleAddAlbumToQueue(item, e)} title="Add to queue" style={{
                      background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 4,
                      color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', padding: '3px 6px',
                    }}>+Q</button>
                    <button onClick={e => handleAddAlbumToFrontQueue(item, e)} title="Add to front of queue" style={{
                      background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 4,
                      color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', padding: '3px 6px',
                    }}>+F</button>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {item.Type === 'MusicAlbum' ? '▸' : lib.ticksToTime(item.RunTimeTicks)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : ( tab === 'PLACEHOLDER' )}
      </div>
    </>
  );
}

// ── Main Player ──────────────────────────────────────────────────────────────
interface MusicPlayerProps {
  selectedDevice: SmartDevice | null;
  onSelectDevice: (device: SmartDevice | null) => void;
  devices: ReturnType<typeof useDevices>;
}

export default function MusicPlayer({
  selectedDevice,
  onSelectDevice,
  devices,
}: MusicPlayerProps) {
  const jellyfin = useJellyfin();
  const lib = useJellyfinLibrary();

  const [showPanel, setShowPanel] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [shuffleActive, setShuffleActive] = useState(false);

  const SHUFFLE_AHEAD = 10;
  const shufflePoolRef = useRef<any[]>([]);
  const shuffleModeRef = useRef(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => {
      setNow(Date.now());
    }, 500); // smoother than 1s

    return () => clearInterval(i);
  }, []);

  // ── Device routing ────────────────────────────────────────────────
  const playbackRouter = useRef({
    getDevice: () => selectedDevice,
  }).current;

  const queueRef = useRef<ReturnType<typeof useQueue> | null>(null);

  const playTrack = useCallback(async (itemId: string) => {
    const device = selectedDevice;
    console.log("Casting to device:", selectedDevice);

    if (device) {
      await devices.playOnDevice(device, itemId);
      return;
    }

    await jellyfin.playInBrowser(itemId);
  }, [selectedDevice, devices, jellyfin]);

  // ── Queue ──────────────────────────────────────────────────────────
  const queue = useQueue(
    playTrack,
    undefined,
    () => {
      jellyfin.stopBrowser?.();
      jellyfin.pause?.();
    }
  );

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '--:--';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // ── Shuffle system ────────────────────────────────────────────────
  const queueLengthRef = useRef(queue.queue.length);
  const currentIndexRef = useRef(queue.currentIndex);

  const pendingAddRef = useRef(0);

  queueLengthRef.current = queue.queue.length;
  currentIndexRef.current = queue.currentIndex;

  const topUpQueue = useCallback(() => {
    if (!shuffleModeRef.current) return;

    const effectiveLength =
      queueLengthRef.current + pendingAddRef.current;

    const ahead =
      effectiveLength - (currentIndexRef.current + 1);

    const needed = SHUFFLE_AHEAD - ahead;

    if (needed <= 0) return;

    const toAdd = shufflePoolRef.current.splice(0, needed);

    if (toAdd.length === 0) return;

    pendingAddRef.current += toAdd.length;
    queue.addManyToQueue(toAdd);
  }, [queue]);

  useEffect(() => {
    pendingAddRef.current = 0;
  }, [queue.queue.length]);

  useEffect(() => {
    topUpQueue();
  }, [queue.currentIndex, topUpQueue]);

  const handleShuffle = async () => {
    const tracks = await jellyfin.fetchShuffleTracks(200);
    if (!tracks.length) return;

    const shuffled = [...tracks]
      .sort(() => Math.random() - 0.5)
      .map((t: any) => ({
        ...t,
        queueId: `${t.Id}-${Date.now()}-${Math.random()}`,
      }));

    const first = shuffled.slice(0, SHUFFLE_AHEAD);

    shufflePoolRef.current = shuffled.slice(SHUFFLE_AHEAD);
    shuffleModeRef.current = true;

    queue.clearQueue();
    queue.addManyToQueue(first);

    setTimeout(() => queue.playIndex(0), 0);
    setShuffleActive(true);
  };

  // ── Playback state ────────────────────────────────────────────────
  const {
    track,
    playing,
    progress,
    elapsed,
    duration,
    error,
    play,
    pause,
    next,
    previous,
    browserPlaying,
    browserProgress,
    browserTrackId,
    pauseBrowser,
    resumeBrowser,
    stopBrowser,
  } = jellyfin;

  const deviceState = selectedDevice
    ? devices.playback[selectedDevice.location]
    : null;

  const getDeviceElapsed = () => {
    if (!deviceState) return 0;

    return deviceState.position
  };

  const isPlaying =
    deviceState?.playing ?? browserPlaying ?? playing;

  const activeElapsed = deviceState
    ? formatTime(getDeviceElapsed())
    : elapsed;
  
  const activeProgress = deviceState
    ? Math.min(getDeviceElapsed() / deviceState.duration, 1)
    : browserProgress ?? progress;

  const activeTrack =
    queue.currentIndex >= 0
      ? queue.queue[queue.currentIndex]
      : null;

  const songLength = formatTime(deviceState?.duration ?? 0);
  const showBrowserPlayer = !!browserTrackId;

  const handlePlayPause = async () => {
    if (selectedDevice) {
      if (isPlaying) {
        await devices.pauseDevice(selectedDevice);
      } else {
        await devices.resumeDevice(selectedDevice);
      }
      return;
    }

    isPlaying ? pauseBrowser() : resumeBrowser();
  };

  const useQueueControls = queue.queue.length > 0;

  return (
    <>
      <SidePanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        jellyfin={jellyfin}
        queue={queue}
        lib={lib}
      />

      <div style={{ display: 'flex', width: '100%', height: '100%' }}>

        {/* ── PLAYER ───────────────────────────────────────────── */}
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>Now Playing</div>

            <button onClick={handleShuffle} title="Shuffle" style={{
              fontSize: '11px',
              background: shuffleActive ? 'rgba(var(--accent-rgb, 99,102,241),0.2)' : 'rgba(255,255,255,0.06)',
              border: shuffleActive ? '1px solid var(--accent)' : 'none',
              borderRadius: 6, padding: '3px 8px',
              color: shuffleActive ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {jellyfin.shuffling ? '…' : '🔀 Shuffle'}
            </button>
          </div>

          {/* Track */}
          <div style={{ marginTop: 12 }}>
            <div>{activeTrack?.Name ?? track?.title ?? 'Nothing playing'}</div>
            <div style={{ fontSize: 12 }}>
              {activeTrack?.AlbumArtist ?? track?.artist}
            </div>
          </div>

          {/* Progress */}
          <ProgressBar
            progress={activeProgress}
            onSeek={(ratio) => {
              if (showBrowserPlayer) {
                jellyfin.seekBrowser(ratio);
              }
            }}
          />

         <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: '9px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)'
            }}>
              {activeElapsed}
            </span>

            <span style={{
              fontSize: '9px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)'
            }}>
              {songLength}
            </span>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 16 }}>
            {useQueueControls ? (
              <>
                <CtrlButton onClick={() => queue.playPrev()}>⏮</CtrlButton>

                <CtrlButton onClick={handlePlayPause}>
                  {isPlaying ? '⏸' : '▶'}
                </CtrlButton>

                <CtrlButton onClick={() => queue.playNext()}>⏭</CtrlButton>

                {!selectedDevice && (
                  <CtrlButton onClick={stopBrowser}>⏹</CtrlButton>
                )}
              </>
            ) : (
              <>
                <CtrlButton onClick={previous}>⏮</CtrlButton>
                <CtrlButton onClick={playing ? pause : play}>▶</CtrlButton>
                <CtrlButton onClick={next}>⏭</CtrlButton>
              </>
            )}
            <div style={{ marginLeft: 'auto', position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
              {selectedDevice && (
                <span style={{ fontSize: '10px', color: 'var(--accent)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedDevice.name}
                </span>
              )}
              <CtrlButton
                onClick={() => {
                  setShowDevices(v => !v);
                  jellyfin.loadAudioDevices?.();
                }}
              >
                🔊
              </CtrlButton>

              {showDevices && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowDevices(false)} />
                  <DevicePicker
                    jellyfin={jellyfin}
                    devices={devices}
                    selectedDevice={selectedDevice}
                    onSelectDevice={onSelectDevice}
                    onClose={() => setShowDevices(false)}
                  />
                </>
              )}
            </div> 
          </div>
        </div>

        {/* ── QUEUE ───────────────────────────────────────────── */}
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
      </div>
    </>
  );
}