import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET() {
  const session = await getServerSession(authOptions) as any;

  if (!session?.accessToken) {
    console.log('No access token:', session);
    return NextResponse.json([], { status: 401 });
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&maxResults=50&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );

  const data = await res.json();
  console.log('Calendar response:', data);
  return NextResponse.json(data.items ?? []);
}