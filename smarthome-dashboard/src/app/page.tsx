'use client';

import { useState, useEffect, useRef } from 'react';
import CalendarPanel from '@/components/CalendarPanel';
import SmartArea, { type SmartAreaTab } from '@/components/SmartArea';
import { KioskSleepMode } from '@/components/kiosk';
import type { CalendarEvent, NowPlaying } from '@/components/kiosk/types';
import { useDevices } from '@/hooks/useDevices';
import { SleepProvider } from '@/context/SleepContext';

export default function Home() {
  const [activeTab, setActiveTab] = useState<SmartAreaTab>('Pictures');
  const [layout, setLayout] = useState('Default');
  const [availablePages, setAvailablePages] = useState<SmartAreaTab[]>([]);
  const [mainPage, setMainPage] = useState<SmartAreaTab | undefined>(undefined);
  const controlsRef = useRef<{ pause: () => void; prev: () => void; next: () => void } | null>(null);

  const devicesResult = useDevices();
  const { playback } = devicesResult;

  useEffect(() => {
    const loadSettings = async (isInitial: boolean) => {
      try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        if (isInitial) {
          setActiveTab(settings.defaultTab as SmartAreaTab);
        }
        setLayout(settings.layout ?? 'Default');
        setAvailablePages((settings.availablePages ?? []) as SmartAreaTab[]);
        setMainPage(settings.defaultTab as SmartAreaTab);
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };

    loadSettings(true);
    const handleSettingsChanged = () => loadSettings(false);
    window.addEventListener('settings-changed', handleSettingsChanged);
    return () => window.removeEventListener('settings-changed', handleSettingsChanged);
  }, []);

  const nowPlaying: NowPlaying | null = (() => {
    const active = Object.values(playback).find(s => s.playing && s.title);
    if (!active) return null;
    return {
      title:    active.title    ?? 'Unknown Track',
      artist:   active.artist   ?? 'Unknown Artist',
      playing:  active.playing,
      position: active.position,
      duration: active.duration,
    };
  })();

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/calendar');
        const data = await res.json();
        setEvents(data);
      } catch (e) {
        console.error('Failed to load calendar', e);
      }
    };
    load();
  }, []);

  const isCompact = layout === 'Compact';

return (
    <SleepProvider>
      <KioskSleepMode
        events={events}
        nowPlaying={nowPlaying}
        onWake={() => console.log('Waking up from sleep mode')}
        onPause={() => controlsRef.current?.pause()}
        onPrev={() => controlsRef.current?.prev()}
        onNext={() => controlsRef.current?.next()}
      >
        <main className={`dashboard-root ${isCompact ? 'dashboard-root--compact' : ''}`}>
          <section className="top-half">
            <SmartArea
              activeTab={activeTab}
              onTabChange={setActiveTab}
              devicesResult={devicesResult}
              controlsRef={controlsRef}
              layout={layout}
              availablePages={availablePages}
              mainPage={mainPage}
            />
          </section>

          {!isCompact && (
            <>
              <div className="panel-divider" />
              <section className="bottom-half">
                <CalendarPanel />
              </section>
            </>
          )}
        </main>
      </KioskSleepMode>
    </SleepProvider>
  );
}