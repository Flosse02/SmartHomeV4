'use client';

import { InputBar } from '@/components/form/inputBar';
import { Picker } from '@/components/form/picker';
import { LocationPicker } from '@/components/form/LocationPicker';
import { SaveIcon } from '@/lib/icons';
import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import GoogleAuthButton from '@/components/form/GoogleAuthButton';
import { formatTimezone } from '@/lib/utils/FormatTimeZone';
import { ToggleSwitch } from '@/components/form/ToggleSwitch';
import { StyledButton } from '@/components/form/styledButton';
import { SmartAreaTab, TABS } from '@/components/SmartArea';
import { MultiSelectPicker } from '@/components/form/multiSelectPicker';

type Theme = 'Light' | 'Dark' | 'Auto';

export default function Settings() {
  const { theme, setTheme: setThemeContext, resolvedTheme } = useTheme();
  
  const [layout,         setLayout]         = useState('Default');
  const [mainPage,       setMainPage]       = useState('Pictures');
  const [availablePages, setAvailablePages] = useState<string[]>(TABS);
  const [tempUnits,      setTempUnits]      = useState('');
  const [speedUnits,     setSpeedUnits]     = useState('');
  const [location,       setLocation]       = useState('');
  const [musicLocation,  setMusicLocation]  = useState('');
  const [photoLocation,  setPhotoLocation]  = useState('');
  const [slideshowTimer, setSlideshowTimer] = useState('5');
  const [idleTimeout,    setIdleTimeout]    = useState('10');
  const [timeZone,       setTimeZone]       = useState('');
  const [hour24,         setHour24]         = useState(false);
  const [dirty,          setDirty]          = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [deduping,       setDeduping]       = useState(false);
  const [dedupeMsg,      setDedupeMsg]      = useState<string | null>(null);
  const [deletingAll,    setDeletingAll]    = useState(false);
  const [deleteAllMsg,   setDeleteAllMsg]   = useState<string | null>(null);


  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => {
        setLocation(s.location ?? '');
        setMusicLocation(s.musicLocation ?? '');
        setPhotoLocation(s.photoLocation ?? '');
        setSlideshowTimer(s.slideshowTimer ?? '5');
        setIdleTimeout(s.idleTimeout ?? '10');
        setTempUnits(s.tempUnits ?? '°C');
        setSpeedUnits(s.speedUnits ?? 'km/h');
        if (s.theme) setThemeContext(s.theme);
        setTimeZone(s.timeZone ?? '');
        setHour24(s.hour24 ?? false);
        setMainPage(s.defaultTab ?? 'Pictures');
      });
  }, [setThemeContext]);


  const save = async () => {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        location, 
        tempUnits,
        speedUnits,
        musicLocation, 
        photoLocation, 
        slideshowTimer, 
        idleTimeout,
        theme,
        layout,
        defaultTab: mainPage,
        timeZone,
        hour24,
        availablePages,
      }),
    });
    setSaving(false);
    setDirty(false);
    setSaved(true);
    window.dispatchEvent(new CustomEvent('settings-changed'));
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

  const handleLayoutChange = (value: string) => {
    setLayout(value);
    setDirty(true);
  };

  const handleAvailablePagesChange = (selected: string[]) => {
    setAvailablePages(selected);
    setDirty(true);
  }

  const themeOptions = [
    { value: 'Dark',  label: 'Dark'  },
    { value: 'Light', label: 'Light' },
    { value: 'Auto',  label: 'Auto'  },
  ];

  const layoutOptions = [
    { value: 'Default', label: 'Default' },
    { value: 'Compact', label: 'Compact' },
  ];

  const mainPageOptions = TABS.map(tab => ({ value: tab, label: tab }));
  const availablePagesOptions = TABS.filter(tab => tab !== "Settings").map(tab => ({ value: tab, label: tab }));

  const tempUnitOptions = [
    { value: '°C',  label: '°C'  },
    { value: '°F', label: '°F' },
  ];

  const weatherSpeedOptions = [
    { value: 'km/h',  label: 'km/h'  },
    { value: 'mph', label: 'mph' },
  ];

  const handleDedupe = async () => {
    const confirmed = window.confirm(
      'Remove duplicate recipes? This keeps the oldest copy of each and cannot be undone.'
    );
    if (!confirmed) return;

    setDeduping(true);
    setDedupeMsg(null);
    try {
      const res = await fetch('/api/recipes/dedupe', { method: 'POST' });
      const data = await res.json();
      setDedupeMsg(
        data.removed > 0
          ? `Removed ${data.removed} duplicate${data.removed === 1 ? '' : 's'}.`
          : 'No duplicates found.'
      );
    } catch (e: any) {
      setDedupeMsg('Something went wrong — please try again.');
    } finally {
      setDeduping(false);
    }
  };

  const handleDeleteAll = async () => {
    // This wipes every recipe on the server and every connected device —
    // a plain confirm() is too easy to click through by habit, so require
    // typing the word out to actually go through with it.
    const typed = window.prompt(
      'This will permanently delete ALL recipes on every device. This cannot be undone.\n\nType DELETE to confirm.'
    );
    if (typed !== 'DELETE') return;
 
    setDeletingAll(true);
    setDeleteAllMsg(null);
    try {
      const res = await fetch('/api/recipes/delete-all', { method: 'POST' });
      const data = await res.json();
      setDeleteAllMsg(`Deleted ${data.removed} recipe${data.removed === 1 ? '' : 's'}.`);
    } catch (e: any) {
      setDeleteAllMsg('Something went wrong — please try again.');
    } finally {
      setDeletingAll(false);
    }
  };


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
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Layout</span>
          </div>
          <div className="settings-right">
            <Picker value={layout} options={layoutOptions} onChange={handleLayoutChange} />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Main Page</span>
          </div>
          <div className="settings-right">
            <Picker value={mainPage} options={mainPageOptions} onChange={change(setMainPage)} />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Available Pages</span>
          </div>
          <div className="settings-right">
            <MultiSelectPicker
              options={availablePagesOptions}
              selected={availablePages}
              onChange={handleAvailablePagesChange}
              placeholder="Select pages..."
              setAll={true}
            />
          </div>
        </div>
      </div>

      {/* Time / Location */}
      <div className="settings-section">
        <h2 className="settings-section-label">Location / Time</h2>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">City</span>
            <span className="settings-hint">Used for weather</span>
          </div>
          <div className="settings-right settings-control">
            <LocationPicker
            value={location}
            placeHolder={location}
            onChange={(city, tz) => {
              if (city === null) {
                setDirty(false);
              } else {
                setLocation(city);
                if (tz) setTimeZone(tz);
                setDirty(true);
                setSaved(false);
              }
            }}
          />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Timezone</span>
            <span className="settings-hint">Auto-set from city</span>
          </div>
          <div className="settings-right settings-control">
            <div className="settings-input settings-input--readonly">
              {formatTimezone(timeZone)}
            </div>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Clock format</span>
          </div>
          <div className="settings-right">
            <ToggleSwitch
              active={hour24}
              onToggle={() => {
                setHour24(!hour24);
                setDirty(true);
              }}
              label={hour24 ? '24-hour' : '12-hour'}
            />
          </div>
        </div>
      </div>

      {/* Weather */}
      <div className="settings-section">
        <h2 className="settings-section-label">Weather</h2>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Units</span>
          </div>
          <div className="settings-right">
            <Picker value={tempUnits} options={tempUnitOptions} onChange={change(setTempUnits)} />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Speed</span>
          </div>
          <div className="settings-right">
            <Picker value={speedUnits} options={weatherSpeedOptions} onChange={change(setSpeedUnits)} />
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
            <InputBar fileExplorer={true} placeholder="/c/Users/Username/Music" type="text" value={musicLocation} onChange={change(setMusicLocation)} />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Photos folder</span>
            <span className="settings-hint">Absolute path on server</span>
          </div>
          <div className="settings-right settings-control">
            <InputBar fileExplorer={true} placeholder="/c/Users/Username/Pictures" type="text" value={photoLocation} onChange={change(setPhotoLocation)} />
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

      {/* Login */}
      <div className="settings-section">
        <h2 className="settings-section-label">Connected Accounts</h2>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Google Account</span>
          </div>
          <div className="settings-right settings-control" >
            <GoogleAuthButton />
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="settings-section">
        <h2 className="settings-section-label">Data</h2>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Clean Up Duplicates</span>
            <span className="settings-hint">Remove duplicate recipes</span>
          </div>
          <div className="settings-right settings-control">
            {dedupeMsg && <span style={{ marginRight: 12, fontSize: 13, opacity: 0.8, alignContent: 'center' }}>{dedupeMsg}</span>}
            <button 
              onClick={handleDedupe} disabled={deduping}
              className="settings-button-delete"
              >
              {deduping ? 'Cleaning up…' : 'Clean'}
            </button>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label-wrapper">
            <span className="settings-label">Remove Data</span>
            <span className="settings-hint">Remove recipe data</span>
          </div>
          <div className="settings-right settings-control">
            {deleteAllMsg && <span style={{ marginRight: 12, fontSize: 13, opacity: 0.8, alignContent: 'center' }}>{deleteAllMsg}</span>}
            <button 
              onClick={handleDeleteAll} disabled={deletingAll}
              className="settings-button-delete"
              >
              {deduping ? 'Deleting...' : 'Delete'}
            </button>
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
