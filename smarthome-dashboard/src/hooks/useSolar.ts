// hooks/useSolar.ts
'use client';

import { useEffect, useState, useCallback } from 'react';

interface SolarState {
  pvPower: number | null;
  batterySoc: number | null;
  batteryCharging: boolean;
  batteryDischarging: boolean;
  gridImport: number | null;
  gridExport: number | null;
  consumedPower: number | null;
  loading: boolean;
  error: string | null;
}

const ENTITIES = {
  pvPower:            'sensor.sigen_inverter_pv_power',
  batterySoc:         'sensor.sigen_plant_battery_state_of_charge',
  batteryCharging:    'binary_sensor.sigen_plant_battery_charging',
  batteryDischarging: 'binary_sensor.sigen_plant_battery_discharging',
  gridImport:         'sensor.sigen_plant_grid_import_power',
  gridExport:         'sensor.sigen_plant_grid_export_power',
  consumedPower:      'sensor.sigen_plant_consumed_power',
};

export function useSolar(): SolarState & { refresh: () => void } {
  const [state, setState] = useState<SolarState>({
    pvPower: null, batterySoc: null, batteryCharging: false, batteryDischarging: false,
    gridImport: null, gridExport: null, consumedPower: null, loading: true, error: null,
  });

  const fetchAll = useCallback(async () => {
    try {
      const results = await Promise.all(
        Object.entries(ENTITIES).map(async ([key, entityId]) => {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_HA_URL}/api/states/${entityId}`,
            { headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_HA_TOKEN}` } }
          );
          if (!res.ok) throw new Error(`${entityId} fetch failed (${res.status})`);
          const data = await res.json();
          return [key, data.state] as const;
        })
      );
      const map = Object.fromEntries(results);
      setState({
        pvPower:            parseFloat(map.pvPower) || 0,
        batterySoc:         parseFloat(map.batterySoc) || 0,
        batteryCharging:    map.batteryCharging === 'on',
        batteryDischarging: map.batteryDischarging === 'on',
        gridImport:         parseFloat(map.gridImport) || 0,
        gridExport:         parseFloat(map.gridExport) || 0,
        consumedPower:      parseFloat(map.consumedPower) || 0,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 5000);
    return () => clearInterval(id);
  }, [fetchAll]);

  return { ...state, refresh: fetchAll };
}