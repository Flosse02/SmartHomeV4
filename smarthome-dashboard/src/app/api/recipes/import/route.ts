import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'Missing URL' }, { status: 400 });

  try {
    const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();

    // Try JSON-LD first (most recipe sites use this)
    const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const block of jsonLdMatch) {
        try {
          const inner = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
          const data  = JSON.parse(inner);
          const recipe = Array.isArray(data) ? data.find((d: any) => d['@type'] === 'Recipe') : data['@type'] === 'Recipe' ? data : data['@graph']?.find((d: any) => d['@type'] === 'Recipe');
          if (recipe) return NextResponse.json(parseJsonLd(recipe, url));
        } catch {}
      }
    }

    // Fallback: basic HTML scraping
    const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]?.trim() ?? 'Imported Recipe';
    return NextResponse.json({
      title,
      description: '',
      servings:    4,
      ingredients: [],
      steps:       [],
      source:      url,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function parseJsonLd(r: any, url: string) {
  const ingredients = (r.recipeIngredient ?? []).map((raw: string) => {
    // Basic parse: try to split "1 cup flour" → amount, unit, name
    const match = raw.match(/^([\d./½¼¾⅓⅔⅛]+)?\s*([a-zA-Z]+)?\s+(.+)$/);
    if (match) {
      const amount = parseFraction(match[1] ?? '1');
      const unit   = match[2] ?? '';
      const name   = match[3] ?? raw;
      return { amount, unit, name };
    }
    return { amount: 1, unit: '', name: raw };
  });

  const steps = (r.recipeInstructions ?? []).map((s: any) => ({
    text: typeof s === 'string' ? s : s.text ?? '',
  }));

  const servings = parseInt(
    typeof r.recipeYield === 'string' ? r.recipeYield : Array.isArray(r.recipeYield) ? r.recipeYield[0] : '4'
  ) || 4;

  return {
    title:       r.name ?? 'Imported Recipe',
    description: r.description ?? '',
    image:       Array.isArray(r.image) ? r.image[0]?.url ?? r.image[0] : r.image?.url ?? r.image ?? null,
    servings,
    prepTime:    parseDuration(r.prepTime),
    cookTime:    parseDuration(r.cookTime),
    tags:        r.recipeCategory ? [r.recipeCategory].flat() : [],
    ingredients,
    steps,
    source:      url,
  };
}

function parseFraction(s: string): number {
  if (!s) return 1;
  const fractions: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667, '⅛': 0.125 };
  for (const [k, v] of Object.entries(fractions)) if (s.includes(k)) return v;
  if (s.includes('/')) { const [n, d] = s.split('/'); return parseInt(n) / parseInt(d); }
  return parseFloat(s) || 1;
}

function parseDuration(iso?: string): number | null {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  return (parseInt(match[1] ?? '0') * 60) + parseInt(match[2] ?? '0');
}