'use client';

import { AQIIcon, aqiLabel, RaindropIcon, SunriseIcon, SunsetIcon, ThermometerIcon, UVIndexIcon, WeatherIcon, WindDirectionIcon, windDirLabel, WindIcon } from '@/lib/icons';
import { useEffect } from 'react';
import { WiBarometer } from 'react-icons/wi';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function convertTemp(c: number, toF: boolean) {
  return toF ? Math.round(c * 9 / 5 + 32) : Math.round(c);
}

function convertWind(s: number, toM: boolean) {
  if (typeof s !== 'number' || Number.isNaN(s)) return '--';
  return toM ? Math.round(s * 0.621371) : Math.round(s);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function WeatherStat({ icon, value, label, tooltip, valueStyle }: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  tooltip?: React.ReactNode;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div className="weather-stat" style={{ position: 'relative' }}
      onMouseEnter={e => (e.currentTarget.querySelector('.stat-tooltip') as HTMLElement)?.style.setProperty('display', 'block')}
      onMouseLeave={e => (e.currentTarget.querySelector('.stat-tooltip') as HTMLElement)?.style.setProperty('display', 'none')}
    >
      <span className="weather-stat-icon">{icon}</span>
      <span className="weather-stat-value" style={valueStyle}>{value}</span>
      <span className="weather-stat-label">{label}</span>
      {tooltip && (
        <div className="stat-tooltip" style={{ display: 'none' }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}


const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeatherTab() {
    const { data, error, isLoading } = useSWR('/api/weather', fetcher, { refreshInterval: 5 * 60 * 1000 });
    const { data: settings, mutate: mutateSettings } = useSWR('/api/settings', fetcher);
    useEffect(() => {
        const handler = () => mutateSettings();
        window.addEventListener('settings-changed', handler);
    return () => window.removeEventListener('settings-changed', handler);
    }, [mutateSettings]);


  // ── Early returns after all hooks ──
  if (isLoading) return (
    <div className="weather-page">
      <div className="weather-loading">Loading weather…</div>
    </div>
  );

  if (error || !data || data.error) return (
    <div className="weather-page">
      <div className="weather-loading">No location set — add one in Settings</div>
    </div>
  );

  const isFahrenheit = settings?.tempUnits === '°F';
  const unit         = isFahrenheit ? '°F' : '°C';
  const current      = WeatherIcon({code: data.weatherCode, size: 60});

  const isMph = settings?.speedUnits === 'mph';
  const windUnit = settings?.speedUnits === 'mph' ? 'mph' : 'km/h';

  const todayMoonPhase = data.daily?.moon_phase?.[0];
  const aqiInfo        = data.aqi != null ? aqiLabel(data.aqi) : null;



  return (
    <div className="weather-page">

      {/* Hero */}
      <div className="weather-hero">
        <div className="weather-hero-emoji">{current.icon}</div>
        <div className="weather-hero-temp">{convertTemp(data.temperature, isFahrenheit)}{unit}</div>
        <div className="weather-hero-label">{current.label}</div>
        <div className="weather-hero-location">{data.location}, {data.country}</div>
      </div>

      <div className="weather-stats">
        <WeatherStat
          icon={<ThermometerIcon size={28} />}
          value={`${convertTemp(data.feelsLike, isFahrenheit)}${unit}`}
          label="Feels like"
          tooltip={<>
            <div className="tooltip-title"><span>Temprature</span></div>
            <div className="stat-tooltip-row"><span>Actual</span><span>{convertTemp(data.temperature, isFahrenheit)}{unit}</span></div>
            <div className="stat-tooltip-row"><span>Feels like</span><span>{convertTemp(data.feelsLike, isFahrenheit)}{unit}</span></div>
          </>}
        />
        <WeatherStat
          icon={<RaindropIcon size={28} />}
          value={`${data.humidity}%`}
          label="Humidity"
          tooltip={<>
            <div className="tooltip-title"><span>Humidity</span></div>
            <div className="stat-tooltip-row"><span>Humidity</span><span>{data.humidity}%</span></div>
            <div className="stat-tooltip-row"><span>Comfort</span><span>{data.humidity < 30 ? 'Dry' : data.humidity < 60 ? 'Comfortable' : 'Humid'}</span></div>
          </>}
        />
        <WeatherStat
          icon={<WindIcon size={28} />}
          value={convertWind(data.windSpeed, isMph)}
          label={`${windUnit} wind`}
          tooltip={<>
            <div className="tooltip-title"><span>Wind Speed</span></div>
            <div className="stat-tooltip-row"><span>Speed</span><span>{convertWind(data.windSpeed, isMph)} {windUnit}</span></div>
            <div className="stat-tooltip-row"><span>Max today</span><span>{convertWind(data.daily?.wind_speed_10m_max?.[0], isMph)} {windUnit}</span></div>
          </>}
        />
        {data.windDirection != null && (
          <WeatherStat
            icon={<WindDirectionIcon size={28} degrees={data.windDirection} />}
            value={windDirLabel(data.windDirection)}
            label="Direction"
            tooltip={<>
              <div className="tooltip-title"><span>Wind Direction</span></div>
              <div className="stat-tooltip-row"><span>Bearing</span><span>{data.windDirection}°</span></div>
              <div className="stat-tooltip-row"><span>Direction</span><span>{windDirLabel(data.windDirection)}</span></div>
            </>}
          />
        )}
        {data.uvIndex != null && (
          <WeatherStat
            icon={<UVIndexIcon size={28} />}
            value={Math.round(data.uvIndex)}
            label="UV index"
            tooltip={<>
              <div className="tooltip-title"><span>UV Index</span></div>
              <div className="stat-tooltip-row"><span>Current</span><span>{Math.round(data.uvIndex)}</span></div>
              <div className="stat-tooltip-row"><span>Max today</span><span>{Math.round(data.daily?.uv_index_max?.[0] ?? 0)}</span></div>
              <div className="stat-tooltip-row"><span>Risk</span><span>{data.uvIndex <= 2 ? 'Low' : data.uvIndex <= 5 ? 'Moderate' : data.uvIndex <= 7 ? 'High' : data.uvIndex <= 10 ? 'Very high' : 'Extreme'}</span></div>
            </>}
          />
        )}
        {aqiInfo && (
          <WeatherStat
            icon={<AQIIcon size={24} />}
            value={data.aqi}
            label={'AQI'}
            valueStyle={{ color: aqiInfo.color }}
            tooltip={<>
              <div className="tooltip-title"><span>Air Quality Index</span></div>
              <div className="stat-tooltip-row"><span>AQI</span><span style={{ color: aqiInfo.color }}>{data.aqi} — {aqiInfo.label}</span></div>
              {data.pm25 != null && <div className="stat-tooltip-row"><span>PM2.5</span><span>{data.pm25.toFixed(1)} µg/m³</span></div>}
              {data.pm10 != null && <div className="stat-tooltip-row"><span>PM10</span><span>{data.pm10.toFixed(1)} µg/m³</span></div>}
            </>}
          />
        )}
        {data.daily?.sunrise?.[0] && (
          <WeatherStat
            icon={<SunriseIcon size={28} />}
            value={formatTime(data.daily.sunrise[0])}
            label="Sunrise"
            tooltip={<>
              <div className="tooltip-title"><span>Sunrise</span></div>
              <div className="stat-tooltip-row"><span>Sunrise</span><span>{formatTime(data.daily.sunrise[0])}</span></div>
              <div className="stat-tooltip-row"><span>Tomorrow</span><span>{data.daily.sunrise[1] ? formatTime(data.daily.sunrise[1]) : '—'}</span></div>
            </>}
          />
        )}
        {data.daily?.sunset?.[0] && (
          <WeatherStat
            icon={<SunsetIcon size={28} />}
            value={formatTime(data.daily.sunset[0])}
            label="Sunset"
            tooltip={<>
              <div className="tooltip-title"><span>Sunset</span></div>
              <div className="stat-tooltip-row"><span>Sunset</span><span>{formatTime(data.daily.sunset[0])}</span></div>
              <div className="stat-tooltip-row"><span>Tomorrow</span><span>{data.daily.sunset[1] ? formatTime(data.daily.sunset[1]) : '—'}</span></div>
              <div className="stat-tooltip-row"><span>Daylight</span><span>{(() => {
                const rise = new Date(data.daily.sunrise[0]);
                const set  = new Date(data.daily.sunset[0]);
                const hrs  = Math.floor((set.getTime() - rise.getTime()) / 3600000);
                const mins = Math.floor(((set.getTime() - rise.getTime()) % 3600000) / 60000);
                return `${hrs}h ${mins}m`;
              })()}</span></div>
            </>}
          />
        )}
      </div>

      {/* 24hr hourly strip */}
      {data.hourly && (
        <>
          <div className="divider" style={{ margin: '0 24px' }} />
          <div className="weather-hourly">
            {data.hourly.time.map((timeStr: string, i: number) => {
              const hour = new Date(timeStr).getHours();
              const label = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
              const info  = WeatherIcon({ code: data.hourly.weather_code[i], size: 20 });
              const temp  = convertTemp(data.hourly.temperature_2m[i], isFahrenheit);
              const pop   = data.hourly.precipitation_probability[i];
              return (
                <div key={timeStr} className="weather-hourly-cell">
                  <span className="weather-hourly-time">{label}</span>
                  <span className="weather-hourly-icon">{info.icon}</span>
                  <span className="weather-hourly-temp">{temp}{unit}</span>
                  {pop > 0 && <span className="weather-hourly-pop">{pop}% <RaindropIcon/></span>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="divider" style={{ margin: '0 24px' }} />

      {/* 7-day forecast */}
      <div className="weather-forecast">
        {data.daily.time.map((dateStr: string, i: number) => {
          const date  = new Date(dateStr);
          const day   = i === 0 ? 'Today' : DAY_SHORT[date.getDay()];
          const info  = WeatherIcon({ code: data.daily.weather_code[i], size: 20 });
          const rain  = data.daily.precipitation_sum[i];
          const pop   = data.daily.precipitation_probability_max?.[i];
          const uv    = data.daily.uv_index_max?.[i];
          const min   = convertTemp(data.daily.temperature_2m_min[i], isFahrenheit);
          const max   = convertTemp(data.daily.temperature_2m_max[i], isFahrenheit);
          const absMin = convertTemp(Math.min(...data.daily.temperature_2m_min), isFahrenheit);
          const absMax = convertTemp(Math.max(...data.daily.temperature_2m_max), isFahrenheit);
          const sunRise = formatTime(data.daily.sunrise[i]);
          const sunSet = formatTime(data.daily.sunset[i]);

          return (
            <div key={dateStr} className={`weather-forecast-row ${i === 0 ? 'weather-forecast-row--today' : ''}`}>
              <span className="weather-forecast-day">{day}</span>
              <span className="weather-forecast-emoji">{info.icon}</span>
              <span className="weather-forecast-label">{info.label}</span>
              <span className="weather-forecast-sun">
                <SunriseIcon size={16} color='orange' />
                {formatTime(data.daily.sunrise[i])}
                <SunsetIcon size={16} color='yellow' />
                {formatTime(data.daily.sunset[i])}
              </span>
              <span className="weather-forecast-extras">
                {uv  != null && <span className="weather-forecast-uv">UV - {Math.round(uv)}</span>}
              </span>
              {rain > 0 && (
                <div className='weather-forecast-rain'>
                  <span><RaindropIcon size={10} />{pop}%</span>
                  <span>{rain.toFixed(1)}mm</span>
                </div>
              )}
              <span className="weather-forecast-range">
                <span className="weather-forecast-min">{min}{unit}</span>
                <span className="weather-forecast-bar-wrap">
                  <span className="weather-forecast-bar" style={{
                    '--min': min, '--max': max,
                    '--abs-min': absMin, '--abs-max': absMax,
                  } as React.CSSProperties} />
                </span>
                <span className="weather-forecast-max">{max}{unit}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
