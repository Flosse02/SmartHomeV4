'use client';

import { InputBar } from '@/components/form/inputBar';
import { Picker } from '@/components/form/picker';
import { SaveIcon } from '@/lib/icons';
import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

type Theme = 'Light' | 'Dark' | 'Auto';

export default function Settings() {
  const { theme, setTheme: setThemeContext, resolvedTheme } = useTheme();
  const [location,       setLocation]       = useState('');
  const [musicLocation,  setMusicLocation]  = useState('');
  const [photoLocation,  setPhotoLocation]  = useState('');
  const [slideshowTimer, setSlideshowTimer] = useState('5');
  const [idleTimeout,    setIdleTimeout]    = useState('10');
  const [dirty,          setDirty]          = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => {
        setLocation(s.location ?? '');
        setMusicLocation(s.musicLocation ?? '');
        setPhotoLocation(s.photoLocation ?? '');
        setSlideshowTimer(s.slideshowTimer ?? '5');
        setIdleTimeout(s.idleTimeout ?? '10');
        if (s.theme) setThemeContext(s.theme);
      });
  }, [setThemeContext]);

  const save = async () => {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        location, 
        musicLocation, 
        photoLocation, 
        slideshowTimer, 
        idleTimeout,
        theme  // Save theme to backend
      }),
    });
    setSaving(false);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const change = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setDirty(true);
  };

  // Specific handler for theme (since it needs to update context and dirty state)
  const handleThemeChange = (value: string) => {
    setThemeContext(value as Theme);
    setDirty(true);
  };

  const themeOptions = [
    { value: 'Dark',  label: 'Dark'  },
    { value: 'Light', label: 'Light' },
    { value: 'Auto',  label: 'Auto'  },
  ];

  return (
    <div className="settings">
      <h1 className="settings-title">Settings</h1>

      {/* Appearance */}
      <div className="settings-section">
        <h2 className="settings-section-label">Appearance</h2>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Theme</span>
          </div>
          <div className="settings-right">
            <Picker value={theme} options={themeOptions} onChange={handleThemeChange} />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="settings-section">
        <h2 className="settings-section-label">Location</h2>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">City</span>
            <span className="settings-hint">Used for weather</span>
          </div>
          <div className="settings-right settings-control">
            <InputBar placeholder="Enter City" value={location} onChange={change(setLocation)} />
          </div>
        </div>
      </div>

      {/* Media */}
      <div className="settings-section">
        <h2 className="settings-section-label">Media</h2>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Music folder</span>
            <span className="settings-hint">Absolute path on server</span>
          </div>
          <div className="settings-right settings-control">
            <InputBar placeholder="/c/Users/Username/Music" type="text" value={musicLocation} onChange={change(setMusicLocation)} />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Photos folder</span>
            <span className="settings-hint">Absolute path on server</span>
          </div>
          <div className="settings-right settings-control">
            <InputBar placeholder="/c/Users/Username/Pictures" type="text" value={photoLocation} onChange={change(setPhotoLocation)} />
          </div>
        </div>
      </div>

      {/* Timers */}
      <div className="settings-section">
        <h2 className="settings-section-label">Timers</h2>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Slideshow interval</span>
            <span className="settings-hint">Time between slides in minutes</span>
          </div>
          <div className="settings-right settings-control">
            <InputBar placeholder="Minutes" type="number" value={slideshowTimer} suffix="min" onChange={change(setSlideshowTimer)} />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Sleep timeout</span>
            <span className="settings-hint">Time before entering sleep mode</span>
          </div>
          <div className="settings-right settings-control">
            <InputBar placeholder="Minutes" type="number" value={idleTimeout} suffix="min" onChange={change(setIdleTimeout)} />
          </div>
        </div>
      </div>

      {/* Save Bar */}
      <div className="settings-save-bar">
        {saved && <span className="settings-saved">✓ Saved</span>}
        <button
          onClick={save}
          disabled={!dirty || saving}
          className={`settings-save ${dirty ? 'settings-save--dirty' : 'settings-save--clean'}`}
        >
          {saving ? 'Saving...' : <div className="save-btn"><SaveIcon />Save</div>}
        </button>
      </div>
    </div>
  );
}