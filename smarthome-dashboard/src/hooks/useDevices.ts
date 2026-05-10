import { useState, useCallback } from 'react';

export interface SmartDevice {
  id: string;
  name: string;
  type: 'renderer' | 'server';
  location: string;
  ip: string;
}

export function useDevices() {
  const [devices, setDevices]       = useState<SmartDevice[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const discover = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/devices');
      const data = await res.json();
      setDevices(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const playOnDevice = useCallback(async (device: SmartDevice, itemId: string, title?: string) => {
    const res = await fetch('/api/devices/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceLocation: device.location, itemId, title }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
  }, []);

  return { devices, loading, error, discover, playOnDevice };
}