import { NextResponse } from 'next/server';
import { readSettings, writeSettings } from '@/lib/settings';

export async function GET() {
  return NextResponse.json(readSettings());
}

export async function POST(req: Request) {
  const next = writeSettings(await req.json());
  return NextResponse.json(next);
}