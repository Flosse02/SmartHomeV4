'use client';

import { useState } from 'react';

// ─────────────────────────────────────────────
// Replace this mock with real data from:
//   - Spotify Web API  (useSpotify hook)
//   - MPD local player (useMPD hook)
// ─────────────────────────────────────────────
const MOCK_TRACK = {
  title: 'Add music integration',
  artist: 'Spotify or MPD',
  album: '',
  progress: 0.42,
  duration: '3:41',
  elapsed: '1:33',
  playing: true,
};

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(MOCK_TRACK.playing);
  const track = { ...MOCK_TRACK, playing };

  return (
    <div style={{
      flex: 1,
      padding: '14px 18px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minWidth: 0,
    }}>
      <div className="section-label">Now Playing</div>

      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {track.title}
        </div>
        <div style={{
          fontSize: '11px',
          color: 'var(--text-secondary)',
          marginTop: '2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {track.artist}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{
          height: '2px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '1px',
          marginBottom: '6px',
          cursor: 'pointer',
        }}>
          <div style={{
            height: '100%',
            width: `${track.progress * 100}%`,
            background: 'var(--accent)',
            borderRadius: '1px',
            transition: 'width 1s linear',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {track.elapsed}
          </span>
          <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {track.duration}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <CtrlButton onClick={() => {}}>⏮</CtrlButton>
        <CtrlButton
          onClick={() => setPlaying(p => !p)}
          accent
        >
          {playing ? '⏸' : '▶'}
        </CtrlButton>
        <CtrlButton onClick={() => {}}>⏭</CtrlButton>
        <CtrlButton onClick={() => {}} style={{ marginLeft: 'auto' }}>🔊</CtrlButton>
      </div>
    </div>
  );
}

function CtrlButton({
  children,
  onClick,
  accent,
  style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: accent ? '18px' : '13px',
        color: accent ? 'var(--accent)' : 'var(--text-secondary)',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.15s',
        ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  );
}