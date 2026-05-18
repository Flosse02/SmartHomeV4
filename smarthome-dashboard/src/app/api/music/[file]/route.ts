import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(_req: NextRequest, { params }: { params: { file: string } }) {
  const dir      = process.env.MUSIC_LOCATION ?? '';
  const filePath = path.join(dir, params.file);

  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const stream = fs.createReadStream(filePath);
  return new NextResponse(stream as any, {
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}