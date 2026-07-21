import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ShoppingNote, ShoppingItem } from '@/app/types/shoppingNote';

const DB_PATH = path.join(process.cwd(), 'data', 'shopping-note.json');

function normalizeItem(raw: any): ShoppingItem {
  return {
    id:           typeof raw?.id === 'string' ? raw.id : crypto.randomUUID(),
    name:         typeof raw?.name === 'string' ? raw.name : '',
    amount:       typeof raw?.amount === 'number' ? raw.amount : null,
    unit:         typeof raw?.unit === 'string' ? raw.unit : '',
    checked:      !!raw?.checked,
    recipeTitles: Array.isArray(raw?.recipeTitles) ? raw.recipeTitles : [],
  };
}

const DEFAULT_NOTE: ShoppingNote = {
  items: [],
  updatedAt: new Date(0).toISOString(),
};

function broadcast(type: string, payload: any) {
  const wss = (global as any).wss;
  if (!wss) return;
  const message = JSON.stringify({ type, ...payload });
  wss.clients.forEach((client: any) => {
    if (client.readyState === 1) client.send(message); // 1 = OPEN
  });
}

async function readNote(): Promise<ShoppingNote> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    return { ...DEFAULT_NOTE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTE;
  }
}

async function writeNote(note: ShoppingNote) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(note, null, 2));
}

export async function GET() {
  return NextResponse.json(await readNote());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const note: ShoppingNote = {
    items:     Array.isArray(body.items) ? body.items.map(normalizeItem) : [],
    updatedAt: new Date().toISOString(),
  };
  await writeNote(note);
  broadcast('shopping_note_updated', { note });
  return NextResponse.json(note);
}
