import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Recipe } from '@/app/types/recipe';

const DB_PATH = path.join(process.cwd(), 'data', 'recipes.json');

function broadcast(type: string, payload: any) {
  const wss = (global as any).wss;
  if (!wss) return;
  const message = JSON.stringify({ type, ...payload });
  wss.clients.forEach((client: any) => {
    if (client.readyState === 1) client.send(message); // 1 = OPEN
  });
}


async function readDb(): Promise<Recipe[]> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeDb(recipes: Recipe[]) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(recipes, null, 2));
}

export async function GET(req: NextRequest) {
  const recipes = await readDb();
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase();
  if (q) {
    return NextResponse.json(recipes.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q))
    ));
  }
  return NextResponse.json(recipes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const recipes = await readDb();
  const recipe: Recipe = {
    ...body,
    id:        crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    tags:      body.tags ?? [],
    updatedAt: new Date().toISOString(),
    source:    'server',
  };
  recipes.unshift(recipe);
  await writeDb(recipes);
  broadcast('recipe_added', { recipe });
  return NextResponse.json(recipe);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const recipes = await readDb();
  const idx = recipes.findIndex(r => r.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  recipes[idx] = { ...recipes[idx], ...body };
  recipes[idx].updatedAt = new Date().toISOString();
  recipes[idx].source = 'server';
  await writeDb(recipes);
  broadcast('recipe_updated', { recipe: recipes[idx] });
  return NextResponse.json(recipes[idx]);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const recipes = await readDb();
  const filtered = recipes.filter(r => r.id !== id);
  await writeDb(filtered);
  broadcast('recipe_deleted', { id }); 
  return NextResponse.json({ success: true });
}
