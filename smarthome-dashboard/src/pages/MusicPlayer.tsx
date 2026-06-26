'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useJellyfinLibrary, JellyfinItem } from '@/hooks/useJellyFinLibrary';
import { useQueue } from '@/hooks/useQueue';
import { SmartDevice, useDevices, BROWSER_DEVICE, UseDevicesResult } from '@/hooks/useDevices';
import { CastIcon, PlayIcon, PauseIcon, FastForwardIcon, FastRewindIcon, ShuffleIcon, StopIcon, RefreshIcon, VolumeHighIcon, VolumeMuteIcon, VolumeVeryLowIcon, VolumeLowIcon, CloseIcon, MusicNoteIcon } from '@/lib/icons';
import { Picker } from '@/components/form/picker';
import * as mm from 'music-metadata-browser';

const BASE    = process.env.NEXT_PUBLIC_JELLYFIN_URL     ?? '';
const API_KEY = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY ?? '';

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return '--:--';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function CtrlButton({ children, onClick, accent, disabled, className }: {
  children: React.ReactNode; onClick: () => void;
  accent?: boolean; disabled?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`music-ctrl-btn ${accent ? 'music-ctrl-btn--accent' : ''} ${disabled ? 'music-ctrl-btn--disabled' : ''} ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

function VolumeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const prevVolumeRef = useRef(value > 0 ? value : 1);

  const handleMuteToggle = () => {
    if (value > 0) { prevVolumeRef.current = value; onChange(0); }
    else onChange(prevVolumeRef.current);
  };

  return (
    <div className="music-volume-popup">
      <span className="music-volume-pct">{Math.round(value * 100)}%</span>
      <input
        type="range" min={0} max={1} step={0.01} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="music-volume-range"
      />
      <button onClick={handleMuteToggle} className="music-volume-mute-btn">
        {value > 0 && value <= 0.1 ? <VolumeVeryLowIcon />
          : value > 0.1 && value < 0.5 ? <VolumeLowIcon />
          : value > 0.5 ? <VolumeHighIcon /> : <VolumeMuteIcon />}
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
    <div ref={ref} onPointerDown={e => { dragging.current = true; onSeek(ratio(e)); }} className="music-progress-bar">
      <div className="music-progress-track">
        <div className="music-progress-fill" style={{ width: `${Math.min((progress ?? 0) * 100, 100)}%` }} />
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
  return (
    <div className="music-device-picker">
      <div className="music-device-picker-header">
        <span className="music-device-picker-label">Cast to</span>
        <button onClick={devices.discover} className="music-device-refresh">
          {devices.discovering ? '…' : <RefreshIcon />}
        </button>
      </div>
      {devices.discoverError && (
        <div className="music-device-error">{devices.discoverError}</div>
      )}
      {devices.devices.map(d => (
        <div key={d.id} onClick={() => { onSelect(d); onClose(); }}
          className={`music-device-item ${selectedDevice.id === d.id ? 'music-device-item--active' : ''}`}
        >
          <span>{selectedDevice.id === d.id ? '✓' : '○'}</span>
          <div className="music-device-item-info">
            <div className="music-device-item-name">{d.name}</div>
            {d.ip && <div className="music-device-item-ip">{d.ip}</div>}
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
      className={`music-queue-row ${isCurrent ? 'music-queue-row--current' : ''} ${isDragging ? 'music-queue-row--dragging' : ''}`}
    >
      {imageUrl(track)
        ? <img src={imageUrl(track)!} className="music-queue-art" />
        : <div className="music-queue-art music-queue-art--empty">🎵</div>
      }
      <div className="music-queue-info" onClick={() => onPlayIndex(index)}>
        <div className={`music-queue-title ${isCurrent ? 'music-queue-title--current' : ''}`}>{track.Name}</div>
      </div>
      <button onPointerDown={e => e.stopPropagation()} onClick={() => onRemove(track.queueId)} className="music-queue-remove">✕</button>
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
    <div className="music-queue-panel">
      <div className="music-queue-header">
        <span className="music-section-label">Queue · {visible.length}</span>
        {visible.length > 0 && (
          <button onClick={onClear} className="music-queue-clear">Clear</button>
        )}
      </div>
      <div ref={listRef} className="music-queue-list">
        {visible.map((track: any, i: number) => (
          <div key={track.queueId}>
            {hoverIdx === i && dragIdx !== null && <div className="music-queue-drop-indicator" />}
            <QueueRow
              track={track} index={i} isCurrent={i === 0} isDragging={dragIdx === i}
              onPointerDown={startDrag}
              onPlayIndex={(ui: number) => onPlayIndex(currentIndex + ui)}
              onRemove={onRemove} imageUrl={imageUrl}
            />
          </div>
        ))}
        {hoverIdx === visible.length && dragIdx !== null && <div className="music-queue-drop-indicator" />}
      </div>
    </div>
  );
}

function LocalBrowsePanel({ open, onClose, files, queue }: {
  open: boolean; onClose: () => void;
  files: JellyfinItem[]; queue: ReturnType<typeof useQueue>;
}) {
  const [filter, setFilter] = useState('');
  const visible = filter ? files.filter(f => f.Name.toLowerCase().includes(filter.toLowerCase())) : files;

  return (
    <>
      <div onClick={onClose} className={`music-panel-backdrop ${open ? 'music-panel-backdrop--open' : ''}`} />
      <div className={`music-browse-panel ${open ? 'music-browse-panel--open' : ''}`}>
        <div className="music-browse-header">
          <span className="music-section-label">Local Files</span>
          <button onClick={onClose} className="music-browse-close"><CloseIcon /></button>
        </div>
        <div className="music-browse-search-row">
          <input placeholder="Filter…" value={filter} onChange={e => setFilter(e.target.value)} className="music-browse-input" />
        </div>
        <div className="music-browse-list">
          {visible.map(f => (
            <div key={f.Id} onClick={() => { queue.playNow(f); onClose(); }} className="music-browse-item">
              <div className="music-browse-item-art">🎵</div>
              <div className="music-browse-item-info">
                <div className="music-browse-item-name">{f.Name}</div>
                {f.Album && <div className="music-browse-item-sub">{f.Album}</div>}
              </div>
              <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); queue.addToQueue(f); }} className="music-browse-add">+Q</button>
            </div>
          ))}
          {visible.length === 0 && <div className="music-browse-empty">{files.length === 0 ? 'No files found' : 'No matches'}</div>}
        </div>
      </div>
    </>
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
    if (item.Type === 'MusicAlbum') await lib.getAlbumTracks(item.Id);
    else queue.playNow(item);
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
      <div onClick={onClose} className={`music-panel-backdrop ${open ? 'music-panel-backdrop--open' : ''}`} />
      <div className={`music-browse-panel ${open ? 'music-browse-panel--open' : ''}`}>
        <div className="music-browse-header">
          <span className="music-section-label">Browse</span>
          <button onClick={onClose} className="music-browse-close"><CloseIcon /></button>
        </div>
        <div className="music-browse-search-row">
          <input placeholder="Search tracks, artists, albums…" value={query} onChange={e => handleSearch(e.target.value)} className="music-browse-input" />
          <button onClick={() => { setQuery(''); lib.getAlbums(); }} className="music-browse-albums-btn">Albums</button>
        </div>
        <div className="music-browse-list">
          {lib.loading && <div className="music-browse-empty">Loading…</div>}
          {!lib.loading && lib.results.length === 0 && <div className="music-browse-empty">Search for music or tap Albums</div>}
          {lib.results.map(item => (
            <div key={item.Id} onClick={() => handleAlbumClick(item)} className="music-browse-item">
              {lib.imageUrl(item)
                ? <img src={lib.imageUrl(item)!} alt="" className="music-browse-item-art music-browse-item-art--img" />
                : <div className="music-browse-item-art">{item.Type === 'MusicAlbum' ? '💿' : '🎵'}</div>
              }
              <div className="music-browse-item-info">
                <div className="music-browse-item-name">{item.Name}</div>
                <div className="music-browse-item-sub">
                  {item.AlbumArtist ?? item.Artists?.[0] ?? ''}{item.Album && item.Type !== 'MusicAlbum' ? ` — ${item.Album}` : ''}
                </div>
              </div>
              <div className="music-browse-item-actions">
                <button onClick={e => addAlbumToQueue(item, e)} className="music-browse-add">+Q</button>
                <button onClick={e => addAlbumToQueue(item, e, true)} className="music-browse-add">+F</button>
                <span className="music-browse-duration">{item.Type === 'MusicAlbum' ? '▸' : lib.ticksToTime(item.RunTimeTicks)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

interface MusicPlayerProps {
  devicesResult:    UseDevicesResult;
  controlsRef?:     React.RefObject<{ pause: () => void; prev: () => void; next: () => void } | null>;
}

export default function MusicPlayer({ devicesResult, controlsRef }: MusicPlayerProps) {
  const { nowPlaying, audioRef, stopBrowser, playUrl, playOnDevice, pauseDevice, resumeDevice, seekDevice, setVolume: setDeviceVolume, discover } = devicesResult;
  const playback    = devicesResult.playback;
  const playbackRef = devicesResult.playbackRef;
  const [, forceRender] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceRender(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const queueRef = useRef<typeof queue | null>(null);
  const lib      = useJellyfinLibrary();

  const [selectedDevice,   setSelectedDevice]   = useState<SmartDevice>(BROWSER_DEVICE);
  const [showPanel,        setShowPanel]        = useState(false);
  const [showDevices,      setShowDevices]      = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volume,           setVolume]           = useState(1);
  const [shuffleActive,    setShuffleActive]    = useState(false);

  const musicSourceOptions = [
    { value: 'file',     label: 'Files'    },
    { value: 'jellyfin', label: 'Jellyfin' },
  ];
  const [musicSource,     setMusicSource]     = useState('file');
  const [localFiles,      setLocalFiles]      = useState<JellyfinItem[]>([]);

  const SHUFFLE_AHEAD  = 10;
  const shufflePoolRef = useRef<JellyfinItem[]>([]);
  const shuffleModeRef = useRef(false);
  const pendingAddRef  = useRef(0);

  const selectedDeviceRef = useRef(selectedDevice);
  useEffect(() => { selectedDeviceRef.current = selectedDevice; }, [selectedDevice]);

  useEffect(() => {
    if (selectedDevice.type === 'browser') setVolume(audioRef.current?.volume ?? 1);
    else { const pb = playback[selectedDevice.location]; setVolume(pb?.volume ?? 1); }
  }, [selectedDevice]);

  useEffect(() => {
    if (musicSource !== 'file') return;
    fetch('/api/music').then(r => r.json()).then(d => {
      const files: JellyfinItem[] = (d.files ?? []).map((f: { name: string; path: string }) => ({
        Id: f.path, Name: f.name.split('/').pop()?.replace(/\.[^.]+$/, '') ?? f.name,
        Type: 'Audio', Album: f.name.includes('/') ? f.name.split('/').slice(0, -1).join(' / ') : undefined,
      }));
      setLocalFiles(files);
    });
  }, [musicSource]);

  useEffect(() => { queue.clearQueue(); stopBrowser(); }, [musicSource]);

  const handleVolume = useCallback((v: number) => {
    setVolume(v);
    if (selectedDevice.type === 'browser') { if (audioRef.current) audioRef.current.volume = v; }
    else setDeviceVolume(selectedDevice, v);
  }, [selectedDevice, audioRef, setDeviceVolume]);

  const musicSourceRef = useRef(musicSource);
  useEffect(() => { musicSourceRef.current = musicSource; }, [musicSource]);

  const playTrack = useCallback(async (itemId: string) => {
    if (musicSourceRef.current === 'file') {
      await playUrl(itemId, (tags) => {
        queueRef.current?.updateTrack(itemId, {
          Name: tags.title ?? undefined, Artists: tags.artist != null ? [tags.artist] : undefined, Album: tags.album ?? undefined,
        });
      });
      return;
    }
    const item = queueRef.current?.queue.find(t => t.Id === itemId);
    const duration = item?.RunTimeTicks ? item.RunTimeTicks / 10_000_000 : undefined;
    await playOnDevice(selectedDeviceRef.current, itemId, duration, 0, {
      title: item?.Name ?? undefined, artist: item?.AlbumArtist ?? item?.Artists?.[0] ?? undefined, album: item?.Album ?? undefined,
    });
  }, [playUrl, playOnDevice]);

  const stopAll = useCallback(() => { stopBrowser(); }, [stopBrowser]);
  const queue   = useQueue(playTrack, undefined, stopAll);
  queueRef.current = queue;

  if (controlsRef) {
    controlsRef.current = {
      pause: () => pauseDevice(selectedDeviceRef.current),
      prev:  () => queue.playPrev(),
      next:  () => queue.playNext(),
    };
  }

  const prevDeviceRef = useRef<SmartDevice>(BROWSER_DEVICE);
  useEffect(() => {
    const prev = prevDeviceRef.current;
    prevDeviceRef.current = selectedDevice;
    const current = queueRef.current?.queue[queueRef.current?.currentIndex];
    if (!current || prev.id === selectedDevice.id) return;
    const position = prev.type === 'browser' ? audioRef.current?.currentTime ?? 0 : livePosition;
    const duration = current.RunTimeTicks ? current.RunTimeTicks / 10_000_000 : undefined;
    pauseDevice(prev);
    playOnDevice(selectedDevice, current.Id, duration, position);
  }, [selectedDevice]);

  const handleShuffle = async () => {
    let tracks: JellyfinItem[];
    if (musicSource === 'file') {
      const pool = localFiles.length > 0 ? localFiles : await fetch('/api/music').then(r => r.json()).then(d =>
        (d.files ?? []).map((f: { name: string; path: string }) => ({
          Id: f.path, Name: f.name.split('/').pop()?.replace(/\.[^.]+$/, '') ?? f.name,
          Type: 'Audio', Album: f.name.includes('/') ? f.name.split('/').slice(0, -1).join(' / ') : undefined,
        })));
      const shuffleFirst = [...pool].sort(() => Math.random() - 0.5);
      const first10WithTags = await Promise.all(
        shuffleFirst.slice(0, SHUFFLE_AHEAD).map(async track => {
          try {
            const metadata = await mm.fetchFromUrl(track.Id);
            return { ...track, Name: metadata.common.title ?? track.Name, Artists: metadata.common.artist ? [metadata.common.artist] : track.Artists, Album: metadata.common.album ?? track.Album };
          } catch { return track; }
        })
      );
      tracks = [...first10WithTags, ...shuffleFirst.slice(SHUFFLE_AHEAD)];
    } else {
      const res  = await fetch(`${BASE}/Items?IncludeItemTypes=Audio&Recursive=true&Limit=50&SortBy=Random&api_key=${API_KEY}`);
      const data = await res.json();
      tracks = (data.Items ?? []).sort(() => Math.random() - 0.5);
    }
    if (!tracks.length) return;
    const shuffled = tracks.map(t => ({ ...t, queueId: `${t.Id}-${Date.now()}-${Math.random()}` }));
    shufflePoolRef.current = shuffled.slice(SHUFFLE_AHEAD);
    shuffleModeRef.current = true;
    pendingAddRef.current  = 0;
    queue.clearQueue();
    requestAnimationFrame(() => {
      shuffleModeRef.current = true;
      queue.addManyToQueue(shuffled.slice(0, SHUFFLE_AHEAD));
      requestAnimationFrame(() => { queue.playIndex(0); });
    });
    setShuffleActive(true);
  };

  const topUpQueue = useCallback(() => {
    if (!shuffleModeRef.current) return;
    const ahead  = (queue.queue.length + pendingAddRef.current) - (queue.currentIndex + 1);
    const needed = SHUFFLE_AHEAD - ahead;
    if (needed <= 0) return;
    const toAdd = shufflePoolRef.current.splice(0, needed);
    if (!toAdd.length) return;
    pendingAddRef.current += toAdd.length;
    queue.addManyToQueue(toAdd);
    if (musicSourceRef.current === 'file') {
      toAdd.forEach(track => {
        mm.fetchFromUrl(track.Id).then(metadata => {
          const title = metadata.common.title, artist = metadata.common.artist, album = metadata.common.album;
          if (title || artist || album) queueRef.current?.updateTrack(track.Id, { Name: title ?? undefined, Artists: artist != null ? [artist] : undefined, Album: album ?? undefined });
        }).catch(() => {});
      });
    }
  }, [queue]);

  useEffect(() => { pendingAddRef.current = 0; }, [queue.queue.length]);
  useEffect(() => { topUpQueue(); }, [queue.currentIndex]);

  const pb          = playback[selectedDevice.location] ?? { playing: false, position: 0, duration: 0, updatedAt: 0, positionFetchedAt: 0 };
  const isPlaying   = pb.playing;
  const activeTrack = queue.currentIndex >= 0 ? queue.queue[queue.currentIndex] : null;

  const livePosition = pb.playing && selectedDevice.type === 'renderer'
    ? pb.position + (Date.now() - pb.positionFetchedAt) / 1000
    : pb.playing && selectedDevice.type === 'browser'
    ? pb.position + (Date.now() - pb.updatedAt) / 1000
    : pb.position;

  const progress = pb.duration > 0 ? Math.min(livePosition / pb.duration, 1) : 0;

  const albumArtUrl = activeTrack && musicSource === 'jellyfin'
    ? lib.imageUrl(activeTrack)
    : null;

  const handlePlayPause = async () => {
    isPlaying ? await pauseDevice(selectedDevice) : await resumeDevice(selectedDevice);
  };

  const VolumeIcon = volume > 0 && volume <= 0.1 ? <VolumeVeryLowIcon />
    : volume > 0.1 && volume < 0.5 ? <VolumeLowIcon />
    : volume > 0.5 ? <VolumeHighIcon /> : <VolumeMuteIcon />;

  return (
    <>
      {musicSource === 'jellyfin'
        ? <BrowsePanel      open={showPanel} onClose={() => setShowPanel(false)} lib={lib} queue={queue} />
        : <LocalBrowsePanel open={showPanel} onClose={() => setShowPanel(false)} files={localFiles} queue={queue} />
      }

      <div className="music-page">

        {/* ── PLAYER ── */}
        <div className="music-player">

          {/* Top bar */}
          <div className="music-top-bar">
            <div className="music-source-row">
              <span className="music-section-label">Source</span>
              <Picker options={musicSourceOptions} value={musicSource} onChange={setMusicSource} />
            </div>
            <div className="music-top-actions">
              <button onClick={() => setShowPanel(true)} className="shuffle-btn">Browse</button>
              <button onClick={handleShuffle} className={`shuffle-btn ${shuffleActive ? 'active' : ''}`}>
                <ShuffleIcon /> Shuffle
              </button>
            </div>
          </div>

          {/* Now playing */}
          <div className="music-now-playing">
            {/* Album art */}
            <div className="music-album-art">
              {albumArtUrl
                ? <img src={albumArtUrl} className="music-album-art-img" />
                : <div className="music-album-art-placeholder"><MusicNoteIcon /></div>
              }
            </div>

            {/* Track info + controls */}
            <div className="music-track-col">
              <div className="music-track-info">
                <div className="music-track-title">{pb.title ?? activeTrack?.Name ?? 'Nothing playing'}</div>
                <div className="music-track-artist">{pb.artist ?? activeTrack?.AlbumArtist ?? activeTrack?.Artists?.[0] ?? ''}</div>
                {(pb.album ?? activeTrack?.Album) && (
                  <div className="music-track-album">{pb.album ?? activeTrack?.Album}</div>
                )}
              </div>

              {/* Progress */}
              <div className="music-progress-col">
                <ProgressBar progress={progress} onSeek={ratio => seekDevice(selectedDevice, ratio)} />
                <div className="music-time-row">
                  <span className="music-time">{formatTime(livePosition)}</span>
                  <span className="music-time">{formatTime(pb.duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="music-controls-row">
                <div className="music-controls">
                  <CtrlButton onClick={() => queue.playPrev()}><FastRewindIcon /></CtrlButton>
                  <CtrlButton onClick={handlePlayPause} accent>{isPlaying ? <PauseIcon /> : <PlayIcon />}</CtrlButton>
                  <CtrlButton onClick={() => queue.playNext()}><FastForwardIcon /></CtrlButton>
                  {selectedDevice.type === 'browser' && (
                    <CtrlButton onClick={stopBrowser}><StopIcon /></CtrlButton>
                  )}
                </div>

                <div className="music-side-controls">
                  {/* Device picker */}
                  <div className="music-device-wrap">
                    {selectedDevice.id !== 'browser' && (
                      <span className="music-cast-name">{selectedDevice.name}</span>
                    )}
                    <CtrlButton onClick={() => { setShowDevices(v => !v); discover(); }}><CastIcon /></CtrlButton>
                    {showDevices && (
                      <>
                        <div className="music-dropdown-backdrop" onClick={() => setShowDevices(false)} />
                        <DevicePicker devices={devicesResult} selectedDevice={selectedDevice} onSelect={setSelectedDevice} onClose={() => setShowDevices(false)} />
                      </>
                    )}
                  </div>

                  {/* Volume */}
                  <div className="music-volume-wrap">
                    <CtrlButton onClick={() => setShowVolumeSlider(v => !v)}>{VolumeIcon}</CtrlButton>
                    {showVolumeSlider && (
                      <>
                        <div className="music-dropdown-backdrop" onClick={() => setShowVolumeSlider(false)} />
                        <VolumeSlider value={volume} onChange={handleVolume} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── QUEUE ── */}
        {queue.queue.length > 0 && (
          <QueuePanel
            queue={queue.queue}
            currentIndex={queue.currentIndex}
            onMove={queue.move}
            onRemove={queue.removeFromQueue}
            onPlayIndex={queue.playIndex}
            onClear={queue.clearQueue}
            imageUrl={lib.imageUrl}
          />
        )}
      </div>
    </>
  );
}