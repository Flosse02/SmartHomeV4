'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import Slideshow from '../pages/Slideshow';
import MusicPlayer from '../pages/MusicPlayer';
import SmartHome from '../pages/SmartHome';
import Clock from './Clock';
import { SmartDevice, useDevices } from '@/hooks/useDevices';
import { Weather } from './Weather';

const Notes = dynamic(() => import('../pages/Notes'), { ssr: false });
const Camera = dynamic(() => import('../pages/Camera'), { ssr: false });

export type SmartAreaTab = 'Pictures' | 'Music' | 'Home' | 'Notes' | 'Camera';

const TABS: SmartAreaTab[] = ['Pictures', 'Music', 'Home', 'Notes', 'Camera'];

interface SmartAreaProps {
  activeTab: SmartAreaTab;
  onTabChange: (tab: SmartAreaTab) => void;
}

export default function SmartArea({ activeTab, onTabChange }: SmartAreaProps) {
  const devices = useDevices();
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

      {/* Content */}
      {activeTab === 'Pictures' && <Slideshow />}

      <div style={{ display: activeTab === 'Music' ? 'contents' : 'none' }}>
        <MusicPlayer />
      </div>
      <div style={{ display: activeTab === 'Home' ? 'contents' : 'none' }}>
        <SmartHome
          selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDevice}
          devices={devices}
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