'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'Light' | 'Dark' | 'Auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'Light' | 'Dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const isNightTime = (): boolean => {
  const now = new Date();
  const hours = now.getHours();
  return hours >= 18 || hours < 6;
};



export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('Dark');
  const [resolvedTheme, setResolvedTheme] = useState<'Light' | 'Dark'>('Dark');

  // Load saved theme from API on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => {
        if (s.theme) setTheme(s.theme as Theme);
      })
      .catch(() => {});
  }, []);

  // Resolve actual theme based on system preference
  useEffect(() => {
    if (theme === 'Auto') {
      setResolvedTheme(isNightTime() ? 'Dark' : 'Light');

      const handler = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'Dark' : 'Light');
      };
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handler);
      return () => window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handler);
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'Dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}