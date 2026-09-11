'use client';

const ENTITY_VALUES: Record<string, string> = {
  'sensor.sigen_inverter_pv_power': '3820',
  'sensor.sigen_plant_battery_state_of_charge': '68',
  'binary_sensor.sigen_plant_battery_charging': 'on',
  'binary_sensor.sigen_plant_battery_discharging': 'on',
  'sensor.sigen_plant_grid_import_power': '20',
  'sensor.sigen_plant_grid_export_power': '50',
  'sensor.sigen_plant_consumed_power': '3280',
};

export function installMockSolarFetch() {
  if (typeof window === 'undefined') return;
  if ((window as any).__solarMockInstalled) return;
  (window as any).__solarMockInstalled = true;

  const realFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('/api/states/')) {
      const params = new URLSearchParams(window.location.search);
      const delay = Number(params.get('solarDelay') ?? 300);
      const shouldError = params.get('solarError') === '1';

      await new Promise(r => setTimeout(r, delay));

      if (shouldError) {
        return new Response('Simulated failure', { status: 500 });
      }

      const entityId = url.split('/api/states/')[1];
      const state = ENTITY_VALUES[entityId] ?? '0';

      return new Response(JSON.stringify({ entity_id: entityId, state }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return realFetch(input, init);
  };
}