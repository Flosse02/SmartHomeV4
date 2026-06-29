// src/context/SleepContext.tsx
'use client';

import { createContext, useContext, useState } from 'react';

type SleepContextType = {
  sleepDisabled: boolean;
  setSleepDisabled: (v: boolean) => void;
};

const SleepContext = createContext<SleepContextType | null>(null);

export function SleepProvider({ children }: { children: React.ReactNode }) {
  const [sleepDisabled, setSleepDisabled] = useState(false);

  return (
    <SleepContext.Provider value={{ sleepDisabled, setSleepDisabled }}>
      {children}
    </SleepContext.Provider>
  );
}

export function useSleep() {
  const ctx = useContext(SleepContext);
  if (!ctx) throw new Error('useSleep must be used within SleepProvider');
  return ctx;
}