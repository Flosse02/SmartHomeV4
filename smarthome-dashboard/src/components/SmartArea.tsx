'use client';

import { useState } from 'react';
import Slideshow from './smarthome/Slideshow';
import MusicPlayer from './smarthome/MusicPlayer';
import SmartHome from './smarthome/SmartHome';
import Clock from '@/components/Clock';

const TABS = ['Slideshow', 'Music', 'Smart Home'] as const;
type Tab = typeof TABS[number];

export default function SmartArea() {
  const [activeTab, setActiveTab] = useState<Tab>('Slideshow');

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
      <div className="smart-content">
        {activeTab === 'Slideshow' && <Slideshow />}
        {activeTab === 'Music' && <MusicPlayer />}
        {activeTab === 'Smart Home' && <SmartHome />}
      </div>
    </div>
  );
}