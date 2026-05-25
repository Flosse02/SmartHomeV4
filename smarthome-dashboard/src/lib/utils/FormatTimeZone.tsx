export function formatTimezone(tz: string): string {
  if (!tz) return '—';
  try {
    // Get the UTC offset for this timezone
    const offset = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? '';

    // Extract city name from "Continent/City" or "Continent/Region/City"
    const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;

    return `${city} ${offset}`; // e.g. "Perth GMT+8"
  } catch {
    return tz;
  }
}
