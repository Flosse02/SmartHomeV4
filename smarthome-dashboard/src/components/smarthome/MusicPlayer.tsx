'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useJellyfin } from '@/hooks/useJellyFin';
import { useJellyfinLibrary, JellyfinItem } from '@/hooks/useJellyFinLibrary';
import { useQueue, QueueTrack} from '@/hooks/useQueue';

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
          width: `${Math.min(progress * 100, 100)}%`,
          background: 'var(--accent)',
          borderRadius: '1px',
          transition: isDragging.current ? 'none' : 'width 0.2s linear',
        }} />
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      fontSize: '10px', padding: '3px 8px', borderRadius: 20, cursor: 'pointer',
      background: active ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
      color: active ? 'white' : 'var(--text-secondary)',
      border: 'none', transition: 'background 0.15s', whiteSpace: 'nowrap',
    }}>{label}</button>
  );
}

// ── Device Picker ────────────────────────────────────────────────────────────

function DevicePicker({ jellyfin }: { jellyfin: ReturnType<typeof useJellyfin> }) {
  const { audioDevices, selectedDeviceId, selectOutputDevice, loadAudioDevices, sessions } = jellyfin;
  return (
    <div style={{
      position: 'absolute', top: '110%', right: 0, zIndex: 100,
      background: 'var(--card-bg, #1e1e2e)', borderRadius: 8, padding: '12px',
      minWidth: 240, maxWidth: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
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
          <div key={d.deviceId} onClick={() => selectOutputDevice(d.deviceId)} style={{
            fontSize: '11px', padding: '5px 8px', borderRadius: 4, cursor: 'pointer',
            background: selectedDeviceId === d.deviceId ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: selectedDeviceId === d.deviceId ? 'var(--text-primary)' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{selectedDeviceId === d.deviceId ? '✓' : '○'}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.label || 'Default'}
            </span>
          </div>
        ))}
      </div>
      {sessions.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Jellyfin Sessions
          </div>
          {sessions.map(s => (
            <div key={s.id} style={{ fontSize: '11px', padding: '5px 8px', borderRadius: 4, color: 'var(--text-secondary)' }}>
              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.deviceName}</div>
              {s.nowPlaying && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 1 }}>▶ {s.nowPlaying}</div>}
            </div>
          ))}
        </div>
      )}
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

function QueuePanel({
  queue,
  currentIndex,
  onRemove,
  onMove,
  onPlayIndex,
  imageUrl,
}: any) {
  const listRef = useRef<HTMLDivElement | null>(null);

  const dragIndexRef = useRef<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const getIndexFromY = (y: number) => {
    if (!listRef.current) return 0;

    const items = Array.from(listRef.current.children) as HTMLElement[];

    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (y < mid) return i;
    }

    return items.length;
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (dragIndexRef.current === null) return;

    const idx = getIndexFromY(e.clientY);

    hoverIndexRef.current = idx;
    setHoverIndex(idx);
  };

  const handlePointerUp = () => {
    const from = dragIndexRef.current;
    const to = hoverIndexRef.current;

    if (from !== null && to !== null && from !== to) {
      onMove(currentIndex + from, currentIndex + to);
    }

    dragIndexRef.current = null;
    hoverIndexRef.current = null;
    setHoverIndex(null);

    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  };

  const startDrag = (index: number, e: React.PointerEvent) => {
    dragIndexRef.current = index;
    hoverIndexRef.current = index;

    setHoverIndex(index);

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const visible = queue.slice(currentIndex);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
        {visible.map((track: any, i: number) => {
          const realIndex = currentIndex + i;
          const isCurrent = realIndex === currentIndex;

          return (
            <div key={track.queueId}>
              {/* drop indicator */}
              {hoverIndex === i && dragIndexRef.current !== null && (
                <div
                  style={{
                    height: 2,
                    background: 'var(--accent)',
                    margin: '0 16px',
                  }}
                />
              )}

              <QueueRow
                track={track}
                index={i}
                isCurrent={isCurrent}
                isDragging={dragIndexRef.current === i}
                onPointerDown={startDrag}
                onPlayIndex={(uiIndex: number) =>
                  onPlayIndex(currentIndex + uiIndex)
                }
                onRemove={onRemove}
                imageUrl={imageUrl}
              />
            </div>
          );
        })}
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

export default function MusicPlayer() {
  const jellyfin = useJellyfin();
  const lib = useJellyfinLibrary();
  const [showPanel, setShowPanel] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [shuffleActive, setShuffleActive] = useState(false);
  const previousProgress = useRef(0);
  const hasAdvancedRef = useRef(false);

  const queue = useQueue(
    jellyfin.playInBrowser,
    undefined,
    () => {
      jellyfin.stopBrowser?.();
      jellyfin.pause?.();
    }
  );

  useEffect(() => {
    jellyfin.setOnEnded(() => {
      queue.playNext();
    });
  }, [jellyfin, queue]);

  const handleShuffle = async () => {
    const tracks = await jellyfin.fetchShuffleTracks(200);
    if (tracks.length === 0) return;

    const shuffled = [...tracks].sort(() => Math.random() - 0.5);

    const queueTracks = shuffled.map((t: any) => ({
      ...t,
      queueId: `${t.Id}-${Date.now()}-${Math.random()}`,
    }));

    queue.clearQueue();
    queue.addManyToQueue(queueTracks);

    // wait for reducer to apply state before playing
    setTimeout(() => {
      queue.playIndex(0);
    }, 0);

    setShuffleActive(true);
  };

  const {
    track, playing, progress, elapsed, duration, error,
    play, pause, next, previous,
    browserPlaying, browserProgress, browserTrackId,
    pauseBrowser, resumeBrowser, stopBrowser,
  } = jellyfin;

  const showBrowserPlayer = !!browserTrackId;
  const activeProgress = showBrowserPlayer ? browserProgress : progress;
  const activePlaying = showBrowserPlayer ? browserPlaying : playing;

  // Current queue track info (richer than session poll)
  const queueTrack = queue.currentIndex >= 0 ? queue.queue[queue.currentIndex] : null;

  const activeElapsed = showBrowserPlayer
  ? jellyfin.browserElapsed
  : elapsed;

  const activeDuration = showBrowserPlayer
  ? jellyfin.browserDuration
  : duration;

  return (
  <>
    <SidePanel
      open={showPanel}
      onClose={() => setShowPanel(false)}
      jellyfin={jellyfin}
      queue={queue}
      lib={lib}
    />

    {/* Main layout */}
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      overflow: 'hidden',
      minWidth: 0,
      maxWidth: '100vw',
    }}>

      {/* Player */}
      <div style={{
        flex: 1,
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-label">Now Playing</div>
          <div style={{ display: 'flex', gap: 6 }}>
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

            <button onClick={() => setShowPanel(true)} style={{
              fontSize: '11px',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: 6,
              padding: '3px 8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}>
              Browse
            </button>
          </div>
        </div>

        {/* Track info */}
        {error ? (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ⚠ {error}
          </span>
        ) : (!track && !browserTrackId) ? (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Nothing playing — browse to start
          </span>
        ) : (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
            {(queueTrack ? lib.imageUrl(queueTrack) : track?.imageUrl) && (
              <img
                src={queueTrack ? (lib.imageUrl(queueTrack) ?? '') : (track?.imageUrl ?? '')}
                alt=""
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 4,
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />
            )}

            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {queueTrack?.Name ?? track?.title ?? 'Browser playback'}
              </div>

              <div style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {queueTrack
                  ? (queueTrack.AlbumArtist ?? queueTrack.Artists?.[0] ?? '')
                  : track?.artist}
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        <div>
          <div style={{ marginBottom: 6 }}>
            <ProgressBar
              progress={activeProgress}
              onSeek={(ratio) => {
                if (showBrowserPlayer) {
                  jellyfin.seekBrowser(ratio);
                }
              }}
            />
          </div>

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
              {activeDuration}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {showBrowserPlayer ? (
            <>
              <CtrlButton
                onClick={() => queue.playPrev()}
                disabled={queue.currentIndex <= 0}
              >
                ⏮
              </CtrlButton>

              <CtrlButton
                accent
                onClick={browserPlaying ? pauseBrowser : resumeBrowser}
              >
                {browserPlaying ? '⏸' : '▶'}
              </CtrlButton>

              <CtrlButton
                onClick={() => queue.playNext()}
                disabled={queue.currentIndex >= queue.queue.length - 1}
              >
                ⏭
              </CtrlButton>

              <CtrlButton onClick={stopBrowser} style={{ fontSize: '11px' }}>
                ⏹
              </CtrlButton>
            </>
          ) : (
            <>
              <CtrlButton onClick={previous} disabled={!track}>
                ⏮
              </CtrlButton>

              <CtrlButton accent onClick={playing ? pause : play} disabled={!track}>
                {playing ? '⏸' : '▶'}
              </CtrlButton>

              <CtrlButton onClick={next} disabled={!track}>
                ⏭
              </CtrlButton>
            </>
          )}

          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <CtrlButton onClick={() => {
              setShowDevices(v => !v);
              jellyfin.loadAudioDevices();
            }}>
              🔊
            </CtrlButton>

            {showDevices && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                  onClick={() => setShowDevices(false)}
                />

                <DevicePicker jellyfin={jellyfin} />
              </>
            )}
          </div>
        </div>

      </div>

      {/* Queue */}
      <div style={{
        width: 'clamp(240px, 28vw, 320px)',
        flexShrink: 0,
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          Queue
        </div>

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