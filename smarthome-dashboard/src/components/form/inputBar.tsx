'use client';

import { useState, useRef, JSX } from 'react';
import { CloseIcon, FolderIcon, UpArrowIcon } from '@/lib/icons';

interface BrowseEntry { name: string; path: string; }
interface BrowseResult { path: string; parent: string; entries: BrowseEntry[]; }

function FolderBrowser({ onSelect, onClose }: { onSelect: (p: string) => void; onClose: () => void }) {
  const [current, setCurrent] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(false);

  const browse = async (dir: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/browse?path=${encodeURIComponent(dir)}`);
      const data = await res.json();
      if (!data.error) setCurrent(data);
    } finally {
      setLoading(false);
    }
  };

  // Load root on first open
  if (!current && !loading) browse('/');

  return (
    <div className="folder-browser-backdrop" onClick={onClose}>
      <div className="folder-browser" onClick={e => e.stopPropagation()}>
        <div className="folder-browser-header">
          <span className="folder-browser-path">{current?.path ?? '…'}</span>
          <button className="folder-browser-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="folder-browser-list">
          {current?.path !== '/' && current && (
            <div className="folder-browser-item folder-browser-item--up" onClick={() => browse(current.parent)}>
              <UpArrowIcon /> ...
            </div>
          )}
          {loading && <div className="folder-browser-loading">Loading…</div>}
          {current?.entries.map(e => (
            <div key={e.path} className="folder-browser-item" onClick={() => browse(e.path)}>
              <i className="ti ti-folder" aria-hidden="true" />
              {e.name}
            </div>
          ))}
        </div>
        <div className="folder-browser-footer">
          <button className="folder-browser-select" onClick={() => { if (current) { onSelect(current.path); onClose(); } }}>
            Select "{current?.path.split('/').pop() || '/'}"
          </button>
        </div>
      </div>
    </div>
  );
}

interface InputBarProps {
  placeholder?: string;
  fileExplorer?: boolean;
  value: string | number;
  type?: string;
  suffix?: string | JSX.Element;
  prefix?: string | JSX.Element;
  min?: number;
  max?: number;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
}

export function InputBar({ placeholder, fileExplorer, value, type, suffix, prefix, min, max, onChange, onKeyDown, style }: InputBarProps) {
  const [showBrowser, setShowBrowser] = useState(false);

  console.log('InputBar', { placeholder, fileExplorer, value, type, suffix, prefix, min, max, onChange, onKeyDown, style });
  return (
    <>
      <div className="input-wrapper" style={{ paddingRight: 4, ...style }}>
        {prefix && <span className="input-prefix" style={{paddingRight: 5}}>{prefix}</span>}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {suffix && <span className="input-suffix" style={{paddingRight: 20}}>{suffix}</span>}
        {fileExplorer && (
          <button type="button" className="input-file-btn" onClick={() => setShowBrowser(true)} title="Browse folder">
            <FolderIcon />
          </button>
        )}
      </div>
      {showBrowser && (
        <FolderBrowser onSelect={onChange} onClose={() => setShowBrowser(false)} />
      )}
    </>
  );
}