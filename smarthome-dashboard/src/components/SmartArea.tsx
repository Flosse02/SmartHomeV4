'use client';

import { useState } from 'react';
import Slideshow from './smarthome/Slideshow';
import MusicPlayer from './smarthome/MusicPlayer';
import SmartHome from './smarthome/SmartHome';
import Clock from '@/components/Clock';
import { SmartDevice, useDevices } from '@/hooks/useDevices';

const TABS = ['Pictures', 'Music', 'Home'] as const;
type Tab = typeof TABS[number];

export default function SmartArea() {
  const [activeTab, setActiveTab] = useState<Tab>('Pictures');
  const devices = useDevices();
  const [selectedDevice, setSelectedDevice] = useState<SmartDevice | null>(null);


  return (
    <div className="smart-area">
      <div className="smart-topbar">
        <div className="clock-overlay">
          <Clock />
        </div>
        <div className="smart-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`smart-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'Pictures' && <Slideshow />}
        <div style={{ display: activeTab === 'Music' ? 'contents' : 'none' }}>
          <MusicPlayer/>
        </div>
        <div style={{ display: activeTab === 'Home' ? 'contents' : 'none' }}>
          <SmartHome
            selectedDevice={selectedDevice}
            onSelectDevice={setSelectedDevice}
            devices={devices}
          />
        </div>
    </div>
  );
}