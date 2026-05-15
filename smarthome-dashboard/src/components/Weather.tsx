'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { WeatherIcon } from '@/lib/icons';

const fetcher = (url: string) => fetch(url).then(r => r.json());


export function Weather() {
    const { data: weather, error, isLoading } = useSWR(
        '/api/weather',
        fetcher,
        {
        refreshInterval: 5 * 60 * 1000,
        }
    );

    if (error) return <div>Weather failed</div>;
    if (isLoading || !weather) return <div>Loading...</div>;


    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textAlign: 'left',
                marginTop: '6px',
            }}>

            <WeatherIcon code={weather.weatherCode} size={22} />
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
                    {weather.temperature}°C
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
                    Wind: {weather.windSpeed} km/h
                </div>
            </div>
        </div>
    );
}