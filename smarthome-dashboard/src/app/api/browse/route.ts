import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const dir = req.nextUrl.searchParams.get('path') ?? '/';
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return NextResponse.json({
      path: dir,
      parent: path.dirname(dir),
      entries: entries
        .filter(e => e.isDirectory())
        .map(e => ({ name: e.name, path: path.join(dir, e.name) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch {
    return NextResponse.json({ error: 'Cannot read directory' }, { status: 400 });
  }
}