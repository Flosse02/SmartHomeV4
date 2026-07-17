export const HA_URL   = process.env.NEXT_PUBLIC_HA_URL   ?? 'http://localhost:8123';
export const HA_TOKEN = process.env.NEXT_PUBLIC_HA_TOKEN ?? '';

export async function haFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${HA_URL}/api${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`HA API error: ${res.status}`);
  return res.json();
}
