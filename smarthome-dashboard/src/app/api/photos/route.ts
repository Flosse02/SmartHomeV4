import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const dir = path.join(process.cwd(), 'public/photos');
  console.log('Reading photos from', dir);
  const files = fs.readdirSync(dir).filter(f =>
    /\.(jpg|jpeg|png|webp)$/i.test(f)
  );
  console.log('Found photos:', files);
  return NextResponse.json(files.map(f => ({ src: `/photos/${f}` })));
}