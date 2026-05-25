'use client';

import { InputBar } from '@/components/form/inputBar';
import { Picker } from '@/components/form/picker';
import { useState, useEffect } from 'react';

export default function Settings() {
  const [theme,          setTheme]          = useState('Light');
  const [location,       setLocation]       = useState('');
  const [musicLocation,  setMusicLocation]  = useState('');
  const [photoLocation,  setPhotoLocation]  = useState('');
  const [slideshowTimer, setSlideshowTimer] = useState('5');
  const [idleTimeout,    setIdleTimeout]    = useState('10');
  const [dirty,          setDirty]          = useState(false);
  const [saving,         setSaving]         = useState(false);

  // Load settings from API on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => {
        setLocation(s.location           ?? '');
        setMusicLocation(s.musicLocation ?? '');
        setPhotoLocation(s.photoLocation ?? '');
        setSlideshowTimer(s.slideshowTimer ?? '5');
        setIdleTimeout(s.idleTimeout     ?? '10');
      });
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, musicLocation, photoLocation, slideshowTimer, idleTimeout }),
    });
    setSaving(false);
    setDirty(false);
  };

  const change = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setDirty(true);
  };

  const themeOptions = [
    { value: 'Light', label: 'Light' },
    { value: 'Dark',  label: 'Dark'  },
    { value: 'Auto',  label: 'Auto'  },
  ];

  return (
    <div className="settings">
      <h1>Settings</h1>

      <div className="setting-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label>Theme: </label>
        <Picker value={theme} options={themeOptions} onChange={change(setTheme)} />
      </div>

      <div className="setting-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label>Location: </label>
        <InputBar placeholder="Enter City" value={location} onChange={change(setLocation)} />
      </div>

      <div className="setting-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label>Music Location: </label>
        <InputBar placeholder="/c/Users/Username/Music" value={musicLocation} onChange={change(setMusicLocation)} />
      </div>

      <div className="setting-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label>Photo Location: </label>
        <InputBar placeholder="/c/Users/Username/Pictures" value={photoLocation} onChange={change(setPhotoLocation)} />
      </div>

      <div className="setting-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label>Slideshow Timer: </label>
        <InputBar placeholder="Minutes" value={slideshowTimer} onChange={change(setSlideshowTimer)} />
      </div>

      <div className="setting-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label>Idle Timeout: </label>
        <InputBar placeholder="Minutes" value={idleTimeout} onChange={change(setIdleTimeout)} />
      </div>

      {dirty && (
        <button onClick={save} disabled={saving} style={{ marginTop: 16, padding: '8px 20px', cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      )}
    </div>
  );
}