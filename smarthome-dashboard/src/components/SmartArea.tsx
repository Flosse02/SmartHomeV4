'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import Slideshow from '../pages/Slideshow';
import MusicPlayer from '../pages/MusicPlayer';
import SmartHome from '../pages/SmartHome';
import Clock from './Clock';
import { SmartDevice, useDevices, UseDevicesResult } from '@/hooks/useDevices';
import { Weather } from './Weather';

const Notes = dynamic(() => import('../pages/Notes'), { ssr: false });
const Camera = dynamic(() => import('../pages/Camera'), { ssr: false });
const Settings = dynamic(() => import('../pages/Settings'), { ssr: false });
// const Weather = dynamic(() => import('../pages/Weather'), { ssr: false });
// const Clock = dynamic(() => import('../pages/Clock'), { ssr: false });

export type SmartAreaTab = 'Pictures' | 'Music' | 'Home' | 'Notes' | 'Camera' | 'Weather' | 'Clock' | 'Monitor' | 'Settings';

const TABS: SmartAreaTab[] = ['Pictures', 'Music', 'Home', 'Notes', 'Camera', 'Weather', 'Clock', 'Monitor', 'Settings'];

interface SmartAreaProps {
  activeTab:     SmartAreaTab;
  onTabChange:   (tab: SmartAreaTab) => void;
  devicesResult: UseDevicesResult;
  controlsRef?:  React.RefObject<{ pause: () => void; prev: () => void; next: () => void } | null>;
}

export default function SmartArea({ activeTab, onTabChange, devicesResult, controlsRef }: SmartAreaProps) {
  const [selectedDevice, setSelectedDevice] = useState<SmartDevice | null>(null);

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
        {TABS.map(tab => (
          <button
            key={tab}
            className={`smart-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Pictures' && <Slideshow />}

      <div style={{ display: activeTab === 'Music' ? 'contents' : 'none' }}>
        {/* MusicPlayer now receives the shared devices instance */}
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
      {/* <div style={{ display: activeTab === 'Weather' ? 'contents' : 'none' }}>
        <Weather />
      </div>
      <div style={{ display: activeTab === 'Clock' ? 'contents' : 'none' }}>
        <Clock />
      </div> */}
      {/* <div style={{ display: activeTab === 'Monitor' ? 'contents' : 'none' }}>
        <Monitor />
      </div> */}
      <div style={{ display: activeTab === 'Settings' ? 'contents' : 'none' }}>
        <Settings />
      </div>
    </div>
  );
}