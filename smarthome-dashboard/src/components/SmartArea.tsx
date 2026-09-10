'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Slideshow from '../pages/Slideshow';
import MusicPlayer from '../pages/MusicPlayer';
import SmartHome from '../pages/SmartHome';
import Clock from './Clock';
import { SmartDevice, useDevices, UseDevicesResult } from '@/hooks/useDevices';
import { Weather } from './Weather';
import CalendarPanel from './CalendarPanel';

const Notes = dynamic(() => import('../pages/Notes'), { ssr: false });
const Camera = dynamic(() => import('../pages/Camera'), { ssr: false });
const Settings = dynamic(() => import('../pages/Settings'), { ssr: false });
const WeatherTab = dynamic(() => import('../pages/Weather'), { ssr: false });
const ClockTab = dynamic(() => import('../pages/ClockTab'), { ssr: false });
const Monitor = dynamic(() => import('../pages/Monitor'), { ssr: false });
const Jellyfin = dynamic(() => import('../pages/Jellyfin'), { ssr: false });
const Recipes = dynamic(() => import('../pages/Recipes'), { ssr: false });
const Solar = dynamic(() => import('../pages/Solar'), { ssr: false });

export type SmartAreaTab = 'Pictures' | 'Music' | 'Home' | 'Notes' | 'Camera' | 'Solar' | 'Weather' | 'Clock' | 'Monitor' | 'Jellyfin' | 'Recipes' | 'Calendar' | 'Settings';

export const TABS: SmartAreaTab[] = ['Pictures', 'Music', 'Home', 'Notes', 'Camera', 'Solar', 'Weather', 'Clock', 'Monitor', 'Jellyfin', 'Recipes', 'Calendar', 'Settings'];

interface SmartAreaProps {
  activeTab:       SmartAreaTab;
  onTabChange:     (tab: SmartAreaTab) => void;
  devicesResult:   UseDevicesResult;
  controlsRef?:    React.RefObject<{ pause: () => void; prev: () => void; next: () => void } | null>;
  layout?:         string;
  availablePages?: SmartAreaTab[];
  mainPage?:       SmartAreaTab;
}

export default function SmartArea({
  activeTab,
  onTabChange,
  devicesResult,
  controlsRef,
  layout,
  availablePages,
  mainPage,
}: SmartAreaProps) {
  const [selectedDevice, setSelectedDevice] = useState<SmartDevice | null>(null);
  const isJellyfinConfigured = process.env.NEXT_PUBLIC_JELLYFIN_URL &&
                             process.env.NEXT_PUBLIC_JELLYFIN_URL !== '' &&
                             process.env.NEXT_PUBLIC_JELLYFIN_API_KEY &&
                             process.env.NEXT_PUBLIC_JELLYFIN_API_KEY !== '';

  // Warm the JS chunks for the not-yet-visited tabs during idle time so the
  // first click on Jellyfin/Monitor/etc. doesn't pay a load/compile delay.
  // This only fetches the module — it doesn't mount the component, so none
  // of that tab's own polling/effects start until the user actually opens it.

  const isCompact = layout === 'Compact';

  const baseTabs: SmartAreaTab[] = availablePages && availablePages.length > 0
    ? TABS.filter(tab =>
        tab === mainPage ||
        tab === 'Settings' ||
        availablePages.includes(tab)
      )
    : TABS;

  const visibleTabs: SmartAreaTab[] = isCompact
    ? [baseTabs[0], 'Calendar', ...baseTabs.slice(1)]
    : baseTabs;

  useEffect(() => {
    const preload = () => {
      void import('../pages/Notes');
      void import('../pages/Camera');
      void import('../pages/Settings');
      void import('../pages/Weather');
      void import('../pages/ClockTab');
      void import('../pages/Monitor');
      void import('../pages/Jellyfin');
      void import('../pages/Recipes');
      void import('../pages/Solar');
    };

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preload);
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(preload, 1000);
    return () => window.clearTimeout(id);
  }, []);


  return (
    <div className="smart-area">
      <div className="smart-topbar">
        <div className="clock-overlay">
          <Clock monoChrome={false} />
        </div>
        <div className="weather-overlay">
          <Weather />
        </div>
      </div>

      <div className="smart-tabs">
        {visibleTabs.map(tab => (
          <button
            key={tab}
            className={`smart-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: activeTab === 'Pictures' ? 'contents' : 'none' }}>
        <Slideshow />
      </div>
      <div style={{ display: activeTab === 'Music' ? 'contents' : 'none' }}>
        <MusicPlayer devicesResult={devicesResult} controlsRef={controlsRef} />
      </div>
      <div style={{ display: activeTab === 'Home' ? 'contents' : 'none' }}>
        <SmartHome
          selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDevice}
          devices={devicesResult}
        />
      </div>
      <div style={{ display: activeTab === 'Notes' ? 'contents' : 'none' }}>
        <Notes />
      </div>
      <div style={{ display: activeTab === 'Camera' ? 'contents' : 'none' }}>
        <Camera />
      </div>
      {activeTab === 'Weather' && <WeatherTab />}
      {activeTab === 'Solar' && <Solar />}
      <div style={{ display: activeTab === 'Clock' ? 'contents' : 'none' }}>
        <ClockTab />
      </div>
      {activeTab === 'Monitor' && <Monitor />}
      {isJellyfinConfigured
        ? activeTab === 'Jellyfin' && <Jellyfin /> 
        : activeTab === 'Jellyfin' && (
            <div className="monitor-empty">
              💡 Jellyfin not configured — add environment variables to .env.local
            </div>
          )
      }
      <div style={{ display: activeTab === 'Recipes' ? 'contents' : 'none' }}>
        <Recipes />
      </div>
      {isCompact && (
        <div style={{ display: activeTab === 'Calendar' ? 'contents' : 'none' }}>
          <CalendarPanel />
        </div>
      )}
      <div style={{ display: activeTab === 'Settings' ? 'contents' : 'none' }}>
        <Settings />
      </div>
    </div>
  );
}