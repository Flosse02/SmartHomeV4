import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'recipes.json');

interface Recipe {
  id:          string;
  title:       string;
  description?: string;
  image?:       string;
  servings:     number;
  prepTime?:    number;
  cookTime?:    number;
  tags:         string[];
  ingredients:  { amount: number; unit: string; name: string }[];
  steps:        { text: string }[];
  source?:      string;
  createdAt:    string;
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
  };
  recipes.unshift(recipe);
  await writeDb(recipes);
  return NextResponse.json(recipe);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const recipes = await readDb();
  const idx = recipes.findIndex(r => r.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  recipes[idx] = { ...recipes[idx], ...body };
  await writeDb(recipes);
  return NextResponse.json(recipes[idx]);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const recipes = await readDb();
  const filtered = recipes.filter(r => r.id !== id);
  await writeDb(filtered);
  return NextResponse.json({ success: true });
}