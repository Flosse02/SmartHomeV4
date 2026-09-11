import { NextResponse } from 'next/server';
import { readSettings } from '@/lib/settings';

let cachedWeather: any = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000;

async function fetchWithRetry(url: string, retries = 3, timeoutMs = 5000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('All retries failed');
}

export async function GET() {
  try {
    const { location, latitude, longitude } = readSettings();
    console.log('Weather location:', location, latitude, longitude);

    if (!location || latitude == null || longitude == null) {
      return NextResponse.json({ error: 'No location set' }, { status: 400 });
    }

    if (cachedWeather && Date.now() - cacheTime < CACHE_TTL) {
      return NextResponse.json(cachedWeather);
    }

    // No more geocoding step here — LocationPicker already resolved the
    // disambiguated place (name + region + country) and its coordinates
    // at selection time, and those are what get stored in settings.json.
    // Re-geocoding a bare city name here was the source of the original
    // "wrong Perth" bug, since names like "Perth" match multiple places
    // worldwide and Open-Meteo's top search result isn't guaranteed to
    // be the one the user actually picked.

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,apparent_temperature,uv_index` +
      `&hourly=temperature_2m,weather_code,precipitation_probability&forecast_hours=24` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset` +
      `&timezone=auto`;

    console.log('Weather URL:', weatherUrl);
    const weatherRes = await fetchWithRetry(weatherUrl);
    console.log('Weather status:', weatherRes.status);

    if (!weatherRes.ok) {
      const body = await weatherRes.text();
      console.error('Weather error body:', body);
      throw new Error('Failed to fetch weather');
    }

    const weatherData = await weatherRes.json();

    // Fetch air quality separately
    let aqData: any = null;
    try {
      const aqRes = await fetchWithRetry(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
        `&current=us_aqi,pm2_5,pm10&timezone=auto`
      );
      if (aqRes.ok) aqData = await aqRes.json();
    } catch (aqErr) {
      console.error('Air quality fetch failed (non-fatal):', aqErr);
    }


    cachedWeather = {
      location:       location,
      temperature:    weatherData.current.temperature_2m,
      feelsLike:      weatherData.current.apparent_temperature,
      humidity:       weatherData.current.relative_humidity_2m,
      weatherCode:    weatherData.current.weather_code,
      windSpeed:      weatherData.current.wind_speed_10m,
      windDirection:  weatherData.current.wind_direction_10m,
      uvIndex:        weatherData.current.uv_index,
      hourly:         weatherData.hourly,
      daily:          weatherData.daily,
      aqi:            aqData?.current?.us_aqi ?? null,
      pm25:           aqData?.current?.pm2_5 ?? null,
      pm10:           aqData?.current?.pm10 ?? null,
    };
    cacheTime = Date.now();

    return NextResponse.json(cachedWeather);
  } catch (err) {
    console.error(err);
    if (cachedWeather) return NextResponse.json({ ...cachedWeather, stale: true });
    return NextResponse.json({ error: 'Failed to load weather' }, { status: 500 });
  }
}