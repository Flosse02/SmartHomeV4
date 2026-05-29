'use client';

import useSWR from 'swr';
import { WeatherIcon } from '@/lib/icons';
import { useEffect } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());


export function Weather() {
    const { data: weather, error, isLoading } = useSWR(
        '/api/weather',
        fetcher,
        {
        refreshInterval: 60 * 60 * 1000,
        }
    );

    const { data: settings, mutate: mutateSettings } = useSWR('/api/settings', fetcher);
    useEffect(() => {
        const handler = () => mutateSettings();
        window.addEventListener('settings-changed', handler);
        return () => window.removeEventListener('settings-changed', handler);
    }, [mutateSettings]);

    const isFahrenheit = settings?.tempUnits === '°F';

    if (error) return <div>Weather failed</div>;
    if (isLoading || !weather) return <div>Loading...</div>;
    
    const temp = isFahrenheit
        ? Math.round(weather.temperature * 9 / 5 + 32)
        : Math.round(weather.temperature);
    const unit = settings?.tempUnits ?? '°C';

    const windSpeed = isFahrenheit
        ? Math.round(weather.windSpeed * 0.621371)
        : Math.round(weather.windSpeed);

    const windUnit = settings?.speedUnits === 'mph' ? 'mph' : 'km/h';


    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textAlign: 'left',
                marginTop: '6px',
            }}>
            {WeatherIcon({code: weather.weatherCode, size: 22}).icon}
             <div
                style={{
                    textAlign: 'left',
                    marginTop: '6px',
                    flexDirection: 'row'
                }}>
                <div
                    style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                    }}>
                    {temp}{unit}
                </div>

                <div
                    style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--accent)',
                    marginTop: '2px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    }}>
                    Wind: {windSpeed} {windUnit}
                </div>
            </div>
        </div>
    );
}