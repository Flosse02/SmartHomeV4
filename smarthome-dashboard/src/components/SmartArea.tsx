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

export type SmartAreaTab = 'Pictures' | 'Music' | 'Home' | 'Notes' | 'Camera';

const TABS: SmartAreaTab[] = ['Pictures', 'Music', 'Home', 'Notes', 'Camera'];

interface SmartAreaProps {
  activeTab: SmartAreaTab;
  onTabChange: (tab: SmartAreaTab) => void;
  // Passed from page.tsx so MusicPlayer shares the same device state
  // as the sleep overlay — no duplicate polling, no stale data.
  devicesResult: UseDevicesResult;
}

export default function SmartArea({ activeTab, onTabChange, devicesResult }: SmartAreaProps) {
  const [selectedDevice, setSelectedDevice] = useState<SmartDevice | null>(null);

  return (
    <div className="smart-area">
      <div className="smart-topbar">
        <div className="weather-overlay">
          <Weather />
        </div>
        <div className="clock-overlay">
          <Clock />
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
      </div>

      {activeTab === 'Pictures' && <Slideshow />}

      <div style={{ display: activeTab === 'Music' ? 'contents' : 'none' }}>
        {/* MusicPlayer now receives the shared devices instance */}
        <MusicPlayer devicesResult={devicesResult} />
      </div>
      <div style={{ display: activeTab === 'Home' ? 'contents' : 'none' }}>
        <SmartHome
          selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDevice}
          devices={devicesResult.devices}
        />
      </div>
      <div style={{ display: activeTab === 'Notes' ? 'contents' : 'none' }}>
        <Notes />
      </div>
      <div style={{ display: activeTab === 'Camera' ? 'contents' : 'none' }}>
        <Camera />
      </div>
    </div>
  );
}