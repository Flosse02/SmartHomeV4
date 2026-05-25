import { NextResponse } from 'next/server';
import { readSettings } from '@/lib/settings';

export async function GET() {
  try {
    const { location } = readSettings(); // ← fresh on every request

    if (!location) {
      console.warn('Weather location not set');
      return NextResponse.json({ error: 'No location set' }, { status: 400 });
    }

    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
    );
    if (!geoRes.ok) throw new Error('Failed to geocode location');

    const geoData = await geoRes.json();
    const place   = geoData.results?.[0];
    if (!place) throw new Error('Location not found');

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,wind_speed_10m`
    );
    if (!weatherRes.ok) throw new Error('Failed to fetch weather');

    const weatherData = await weatherRes.json();

    return NextResponse.json({
      location:    place.name,
      country:     place.country,
      temperature: weatherData.current.temperature_2m,
      weatherCode: weatherData.current.weather_code,
      windSpeed:   weatherData.current.wind_speed_10m,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load weather' }, { status: 500 });
  }
}