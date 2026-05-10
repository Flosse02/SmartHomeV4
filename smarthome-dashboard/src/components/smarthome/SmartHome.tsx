'use client';

import { SmartDevice, useDevices } from '@/hooks/useDevices';
import { useEffect, useState } from 'react';

interface SmartHomeProps {
  selectedDevice: SmartDevice | null;
  onSelectDevice: (device: SmartDevice | null) => void;
  devices: ReturnType<typeof useDevices>;
}

export default function SmartHome({ selectedDevice, onSelectDevice, devices }: SmartHomeProps) {

  return (
    <div style={{ padding: 20, color: '#fff' }}>
      <h2>Smart Home Control</h2>
      <p>Coming soon...</p>
    </div>
  );
}