'use client';

import { useState, useEffect, useCallback } from 'react';
import { CloseIcon, SearchIcon } from '@/lib/icons';

interface Ingredient { amount: number; unit: string; name: string; }
interface Step       { text: string; }
interface Recipe {
  id:          string;
  title:       string;
  description?: string;
  image?:       string;
  servings:     number;
  prepTime?:    number;
  cookTime?:    number;
  tags:         string[];
  ingredients:  Ingredient[];
  steps:        Step[];
  source?:      string;
  createdAt:    string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(min?: number) {
  if (!min) return null;
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60 ? `${min % 60}m` : ''}`.trim();
}

function scaleAmount(amount: number | null, base: number, current: number) {
  if (amount === null || amount === undefined) return '';
  const scaled = (amount * current) / base;
  if (scaled === Math.floor(scaled)) return String(scaled);
  return scaled.toFixed(1).replace(/\.0$/, '');
}

// ── Cooking mode ──────────────────────────────────────────────────────────────

function CookingMode({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [step,    setStep]    = useState(0);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const total = recipe.steps.length;

  const toggleIngredient = (i: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="recipe-cooking-backdrop">
      <div className="recipe-cooking">

        <div className="recipe-cooking-header">
          <span className="recipe-cooking-title">{recipe.title}</span>
          <div className="recipe-cooking-progress">{step + 1} / {total}</div>
          <button onClick={onClose} className="recipe-cooking-close"><CloseIcon /></button>
        </div>

        {/* Ingredient checklist */}
        <div className="recipe-cooking-ingredients">
          <div className="recipe-cooking-ingredients-label">
            Ingredients · {checked.size}/{recipe.ingredients.length} used
          </div>
          <div className="recipe-cooking-ingredients-list">
            {recipe.ingredients.map((ing, i) => (
              <button
                key={i}
                className={`recipe-cooking-ingredient ${checked.has(i) ? 'recipe-cooking-ingredient--checked' : ''}`}
                onClick={() => toggleIngredient(i)}
              >
                <span className="recipe-cooking-ingredient-check">{checked.has(i) ? '✓' : '○'}</span>
                <span className="recipe-cooking-ingredient-text">
                  <span className="recipe-cooking-ingredient-amount">{[scaleAmount(ing.amount, recipe.servings, recipe.servings), ing.unit].filter(Boolean).join(' ')}</span>
                  {' '}{ing.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step */}
        <div className="recipe-cooking-step">
          <div className="recipe-cooking-step-num">Step {step + 1}</div>
          <div className="recipe-cooking-step-text">{recipe.steps[step].text}</div>
        </div>

        <div className="recipe-cooking-nav">
          <button
            className="recipe-cooking-btn"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
          >← Prev</button>
          <div className="recipe-cooking-dots">
            {recipe.steps.map((_, i) => (
              <button
                key={i}
                className={`recipe-cooking-dot ${i === step ? 'recipe-cooking-dot--active' : i < step ? 'recipe-cooking-dot--done' : ''}`}
                onClick={() => setStep(i)}
              />
            ))}
          </div>
          {step < total - 1
            ? <button className="recipe-cooking-btn recipe-cooking-btn--primary" onClick={() => setStep(s => s + 1)}>Next →</button>
            : <button className="recipe-cooking-btn recipe-cooking-btn--done" onClick={onClose}>Done ✓</button>
          }
        </div>
      </div>
    </div>
  );
}

// ── Recipe detail view ────────────────────────────────────────────────────────

function EditRecipeForm({ recipe, onSave, onDelete, onClose }: { recipe: Recipe; onSave: (r: any) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    title:       recipe.title,
    description: recipe.description ?? '',
    servings:    recipe.servings,
    prepTime:    recipe.prepTime    ?? '',
    cookTime:    recipe.cookTime    ?? '',
    tags:        recipe.tags.join(', '),
    image:       recipe.image       ?? '',
    ingredients: recipe.ingredients.map(i => ({ amount: i.amount != null ? String(i.amount) : '', unit: i.unit ?? '', name: i.name })),
    steps:       recipe.steps.map(s => ({ text: s.text })),
  });
  const [confirmDel, setConfirmDel] = useState(false);

  const setIngredient = (i: number, field: string, val: string) => {
    setForm(f => { const ings = [...f.ingredients]; ings[i] = { ...ings[i], [field]: val }; return { ...f, ingredients: ings }; });
  };

  const setStep = (i: number, val: string) => {
    setForm(f => { const steps = [...f.steps]; steps[i] = { text: val }; return { ...f, steps }; });
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({
      id:          recipe.id,
      title:       form.title.trim(),
      description: form.description.trim(),
      servings:    Number(form.servings) || 4,
      prepTime:    Number(form.prepTime) || null,
      cookTime:    Number(form.cookTime) || null,
      tags:        form.tags.split(',').map(t => t.trim()).filter(Boolean),
      image:       form.image.trim() || null,
      ingredients: form.ingredients.filter(i => i.name.trim()).map(i => ({ amount: i.amount.trim() ? parseFloat(i.amount) : null, unit: i.unit.trim() || null, name: i.name.trim() })),
      steps:       form.steps.filter(s => s.text.trim()),
    });
  };

  return (
    <div className="recipe-detail-backdrop">
      <div className="recipe-detail recipe-form">
        <div className="recipe-form-header">
          <span className="recipe-col-label">Edit Recipe</span>
          <div className="recipe-edit-header-actions">
            {confirmDel
              ? <>
                  <button onClick={() => { onDelete(recipe.id); onClose(); }} className="recipe-del-btn recipe-del-btn--confirm">Confirm delete</button>
                  <button onClick={() => setConfirmDel(false)} className="recipe-del-btn">Cancel</button>
                </>
              : <button onClick={() => setConfirmDel(true)} className="recipe-del-btn">Delete</button>
            }
            <button onClick={onClose} className="recipe-close-btn"><CloseIcon /></button>
          </div>
        </div>

        <div className="recipe-form-body">
          <div className="recipe-form-section">
            <div className="recipe-col-label">Basic Info</div>
            <input className="recipe-input" placeholder="Recipe title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <textarea className="recipe-input recipe-textarea" placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="recipe-form-row">
              <input className="recipe-input" placeholder="Servings" type="number" value={form.servings} onChange={e => setForm(f => ({ ...f, servings: e.target.value as any }))} />
              <input className="recipe-input" placeholder="Prep (min)" type="number" value={form.prepTime} onChange={e => setForm(f => ({ ...f, prepTime: e.target.value as any }))} />
              <input className="recipe-input" placeholder="Cook (min)" type="number" value={form.cookTime} onChange={e => setForm(f => ({ ...f, cookTime: e.target.value as any }))} />
            </div>
            <input className="recipe-input" placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            <input className="recipe-input" placeholder="Image URL (optional)" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
          </div>

          <div className="recipe-form-section">
            <div className="recipe-col-label">Ingredients</div>
            {form.ingredients.map((ing, i) => (
              <div key={i} className="recipe-ing-row">
                <input className="recipe-input recipe-ing-amount" placeholder="Amt"        value={ing.amount} onChange={e => setIngredient(i, 'amount', e.target.value)} />
                <input className="recipe-input recipe-ing-unit"   placeholder="Unit"       value={ing.unit}   onChange={e => setIngredient(i, 'unit',   e.target.value)} />
                <input className="recipe-input recipe-ing-name"   placeholder="Ingredient" value={ing.name}   onChange={e => setIngredient(i, 'name',   e.target.value)} />
                <button className="recipe-remove-btn" onClick={() => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, j) => j !== i) }))}>✕</button>
              </div>
            ))}
            <button className="recipe-add-row-btn" onClick={() => setForm(f => ({ ...f, ingredients: [...f.ingredients, { amount: '', unit: '', name: '' }] }))}>+ Ingredient</button>
          </div>

          <div className="recipe-form-section">
            <div className="recipe-col-label">Steps</div>
            {form.steps.map((step, i) => (
              <div key={i} className="recipe-step-row">
                <span className="recipe-step-num">{i + 1}</span>
                <textarea className="recipe-input recipe-textarea recipe-step-input" placeholder={`Step ${i + 1}…`} value={step.text} onChange={e => setStep(i, e.target.value)} />
                <button className="recipe-remove-btn" onClick={() => setForm(f => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }))}>✕</button>
              </div>
            ))}
            <button className="recipe-add-row-btn" onClick={() => setForm(f => ({ ...f, steps: [...f.steps, { text: '' }] }))}>+ Step</button>
          </div>

          <button className="recipe-cook-btn recipe-save-btn" onClick={handleSave} disabled={!form.title.trim()}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function RecipeView({ recipe, onClose, onDelete, onUpdate }: { recipe: Recipe; onClose: () => void; onDelete: (id: string) => void; onUpdate: (r: any) => void }) {
  const [servings,    setServings]    = useState(recipe.servings);
  const [cookingMode, setCookingMode] = useState(false);
  const [editing,     setEditing]     = useState(false);

  if (cookingMode) return <CookingMode recipe={recipe} onClose={() => setCookingMode(false)} />;
  if (editing) return (
    <EditRecipeForm
      recipe={recipe}
      onSave={data => { onUpdate(data); setEditing(false); }}
      onDelete={onDelete}
      onClose={() => setEditing(false)}
    />
  );

  return (
    <div className="recipe-detail-backdrop">
      <div className="recipe-detail">

        <div className="recipe-detail-header">
          {recipe.image && <img src={recipe.image} className="recipe-detail-image" />}
          <div className="recipe-detail-header-info">
            <h2 className="recipe-detail-title">{recipe.title}</h2>
            {recipe.description && <p className="recipe-detail-desc">{recipe.description}</p>}
            <div className="recipe-detail-meta">
              {fmtTime(recipe.prepTime) && <span className="recipe-meta-badge">Prep {fmtTime(recipe.prepTime)}</span>}
              {fmtTime(recipe.cookTime) && <span className="recipe-meta-badge">Cook {fmtTime(recipe.cookTime)}</span>}
              {recipe.tags.map(t => <span key={t} className="recipe-meta-badge recipe-meta-badge--tag">{t}</span>)}
            </div>
            {recipe.source && (
              <a href={recipe.source} target="_blank" rel="noreferrer" className="recipe-detail-source">View original ↗</a>
            )}
          </div>
          <div className="recipe-detail-actions">
            <button onClick={onClose} className="recipe-close-btn"><CloseIcon /></button>
            <button onClick={() => setEditing(true)} className="recipe-del-btn">Edit</button>
          </div>
        </div>

        <div className="recipe-detail-body">
          <div className="recipe-ingredients-col">
            <div className="recipe-col-header">
              <span className="recipe-col-label">Ingredients</span>
              <div className="recipe-servings-control">
                <button onClick={() => setServings(s => Math.max(1, s - 1))} className="recipe-servings-btn">−</button>
                <span className="recipe-servings-val">{servings}</span>
                <button onClick={() => setServings(s => s + 1)} className="recipe-servings-btn">+</button>
              </div>
            </div>
            <div className="recipe-ingredients-list">
              {recipe.ingredients.map((ing, i) => (
                <div key={i} className="recipe-ingredient">
                  <span className="recipe-ingredient-amount">{[scaleAmount(ing.amount, recipe.servings, servings), ing.unit].filter(Boolean).join(' ')}</span>
                  <span className="recipe-ingredient-name">{ing.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="recipe-steps-col">
            <div className="recipe-col-label">Method</div>
            <div className="recipe-steps-list">
              {recipe.steps.map((step, i) => (
                <div key={i} className="recipe-step">
                  <div className="recipe-step-num">{i + 1}</div>
                  <div className="recipe-step-text">{step.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => setCookingMode(true)} className="recipe-cook-btn">Cook</button>
      </div>
    </div>
  );
}

// ── Add recipe form ────────────────────────────────────────────────────────────

const EMPTY_RECIPE = {
  title: '', description: '', servings: 4, prepTime: '', cookTime: '',
  tags: '', image: '',
  ingredients: [{ amount: '', unit: '', name: '' }],
  steps: [{ text: '' }],
};

function AddRecipeForm({ onSave, onClose }: { onSave: (r: any) => void; onClose: () => void }) {
  const [form,        setForm]        = useState(EMPTY_RECIPE);
  const [importUrl,   setImportUrl]   = useState('');
  const [importing,   setImporting]   = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [tab,         setTab]         = useState<'manual' | 'url'>('manual');

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    try {
      const res  = await fetch('/api/recipes/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: importUrl }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setForm({
        title:       data.title       ?? '',
        description: data.description ?? '',
        servings:    data.servings    ?? 4,
        prepTime:    data.prepTime    ?? '',
        cookTime:    data.cookTime    ?? '',
        tags:        (data.tags ?? []).join(', '),
        image:       data.image       ?? '',
        ingredients: data.ingredients?.length ? data.ingredients.map((i: any) => ({ amount: String(i.amount), unit: i.unit, name: i.name })) : [{ amount: '', unit: '', name: '' }],
        steps:       data.steps?.length ? data.steps : [{ text: '' }],
      });
      setTab('manual');
    } catch (e: any) {
      setImportError(e.message);
    } finally {
      setImporting(false);
    }
  };

  const setIngredient = (i: number, field: string, val: string) => {
    setForm(f => { const ings = [...f.ingredients]; ings[i] = { ...ings[i], [field]: val }; return { ...f, ingredients: ings }; });
  };

  const setStep = (i: number, val: string) => {
    setForm(f => { const steps = [...f.steps]; steps[i] = { text: val }; return { ...f, steps }; });
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({
      title:       form.title.trim(),
      description: form.description.trim(),
      servings:    Number(form.servings) || 4,
      prepTime:    Number(form.prepTime) || null,
      cookTime:    Number(form.cookTime) || null,
      tags:        form.tags.split(',').map(t => t.trim()).filter(Boolean),
      image:       form.image.trim() || null,
      ingredients: form.ingredients.filter(i => i.name.trim()).map(i => ({ amount: i.amount.trim() ? parseFloat(i.amount) : null, unit: i.unit.trim() || null, name: i.name.trim() })),
      steps:       form.steps.filter(s => s.text.trim()),
    });
  };

  return (
    <div className="recipe-detail-backdrop">
      <div className="recipe-detail recipe-form">

        <div className="recipe-form-header">
          <div className="recipe-form-tabs">
            <button className={`recipe-form-tab ${tab === 'manual' ? 'recipe-form-tab--active' : ''}`} onClick={() => setTab('manual')}>Manual</button>
            <button className={`recipe-form-tab ${tab === 'url' ? 'recipe-form-tab--active' : ''}`} onClick={() => setTab('url')}>Import URL</button>
          </div>
          <button onClick={onClose} className="recipe-close-btn"><CloseIcon /></button>
        </div>

        {tab === 'url' && (
          <div className="recipe-import-row">
            <input className="recipe-input recipe-import-input" placeholder="https://..." value={importUrl} onChange={e => setImportUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleImport()} />
            <button className="recipe-cook-btn" onClick={handleImport} disabled={importing}>{importing ? '…' : 'Import'}</button>
            {importError && <div className="recipe-import-error">{importError}</div>}
          </div>
        )}

        {tab === 'manual' && (
          <div className="recipe-form-body">
            {/* Basic info */}
            <div className="recipe-form-section">
              <div className="recipe-col-label">Basic Info</div>
              <input className="recipe-input" placeholder="Recipe title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <textarea className="recipe-input recipe-textarea" placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <div className="recipe-form-row">
                <input className="recipe-input" placeholder="Servings" type="number" value={form.servings} onChange={e => setForm(f => ({ ...f, servings: e.target.value as any }))} />
                <input className="recipe-input" placeholder="Prep (min)" type="number" value={form.prepTime} onChange={e => setForm(f => ({ ...f, prepTime: e.target.value as any }))} />
                <input className="recipe-input" placeholder="Cook (min)" type="number" value={form.cookTime} onChange={e => setForm(f => ({ ...f, cookTime: e.target.value as any }))} />
              </div>
              <input className="recipe-input" placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              <input className="recipe-input" placeholder="Image URL (optional)" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
            </div>

            {/* Ingredients */}
            <div className="recipe-form-section">
              <div className="recipe-col-label">Ingredients</div>
              {form.ingredients.map((ing, i) => (
                <div key={i} className="recipe-ing-row">
                  <input className="recipe-input recipe-ing-amount" placeholder="Amt" value={ing.amount} onChange={e => setIngredient(i, 'amount', e.target.value)} />
                  <input className="recipe-input recipe-ing-unit"   placeholder="Unit" value={ing.unit}   onChange={e => setIngredient(i, 'unit',   e.target.value)} />
                  <input className="recipe-input recipe-ing-name"   placeholder="Ingredient" value={ing.name} onChange={e => setIngredient(i, 'name', e.target.value)} />
                  <button className="recipe-remove-btn" onClick={() => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, j) => j !== i) }))}>✕</button>
                </div>
              ))}
              <button className="recipe-add-row-btn" onClick={() => setForm(f => ({ ...f, ingredients: [...f.ingredients, { amount: '', unit: '', name: '' }] }))}>+ Ingredient</button>
            </div>

            {/* Steps */}
            <div className="recipe-form-section">
              <div className="recipe-col-label">Steps</div>
              {form.steps.map((step, i) => (
                <div key={i} className="recipe-step-row">
                  <span className="recipe-step-num">{i + 1}</span>
                  <textarea className="recipe-input recipe-textarea recipe-step-input" placeholder={`Step ${i + 1}…`} value={step.text} onChange={e => setStep(i, e.target.value)} />
                  <button className="recipe-remove-btn" onClick={() => setForm(f => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }))}>✕</button>
                </div>
              ))}
              <button className="recipe-add-row-btn" onClick={() => setForm(f => ({ ...f, steps: [...f.steps, { text: '' }] }))}>+ Step</button>
            </div>

            <button className="recipe-cook-btn recipe-save-btn" onClick={handleSave} disabled={!form.title.trim()}>Save Recipe</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Recipe grid card ──────────────────────────────────────────────────────────

function RecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  return (
    <div className="recipe-card" onClick={onClick}>
      {recipe.image
        ? <img src={recipe.image} className="recipe-card-image" loading="lazy" />
        : <div className="recipe-card-image recipe-card-image--empty">🍳</div>
      }
      <div className="recipe-card-body">
        <div className="recipe-card-title">{recipe.title}</div>
        <div className="recipe-card-meta">
          {fmtTime((recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)) && (
            <span className="recipe-card-time">⏱ {fmtTime((recipe.prepTime ?? 0) + (recipe.cookTime ?? 0))}</span>
          )}
          <span className="recipe-card-servings">👤 {recipe.servings}</span>
        </div>
        {recipe.tags.length > 0 && (
          <div className="recipe-card-tags">
            {recipe.tags.slice(0, 3).map(t => <span key={t} className="recipe-meta-badge recipe-meta-badge--tag">{t}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Recipes() {
  const [recipes,  setRecipes]  = useState<Recipe[]>([]);
  const [query,    setQuery]    = useState('');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [adding,   setAdding]   = useState(false);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const res  = await fetch(q ? `/api/recipes?q=${encodeURIComponent(q)}` : '/api/recipes');
      const data = await res.json();
      setRecipes(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSave = async (data: any) => {
    await fetch('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setAdding(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/recipes?id=${id}`, { method: 'DELETE' });
    load();
  };

  const handleUpdate = async (data: any) => {
    await fetch('/api/recipes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setSelected(prev => prev?.id === data.id ? { ...prev, ...data } : prev);
    load();
  };

  return (
    <>
      {selected && (
        <RecipeView recipe={selected} onClose={() => setSelected(null)} onDelete={handleDelete} onUpdate={handleUpdate} />
      )}
      {adding && (
        <AddRecipeForm onSave={handleSave} onClose={() => setAdding(false)} />
      )}

      <div className="recipe-page">
        <div className="recipe-toolbar">
          <h1 className="recipe-page-title">Recipes</h1>
          <div className="recipe-search-wrap">
            <SearchIcon />
            <input
              className="recipe-search"
              placeholder="Search recipes…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button className="recipe-cook-btn" onClick={() => setAdding(true)}>+ Add</button>
        </div>

        {loading && <div className="recipe-empty">Loading…</div>}

        {!loading && recipes.length === 0 && (
          <div className="recipe-empty">
            {query ? 'No recipes match your search' : 'No recipes yet — add one or import from a URL'}
          </div>
        )}

        {!loading && recipes.length > 0 && (
          <div className="recipe-grid">
            {recipes.map(r => (
              <RecipeCard key={r.id} recipe={r} onClick={() => setSelected(r)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}