'use client';

import { AddIcon, CloseIcon } from '@/lib/icons';
import { useState, useRef, useCallback, useEffect } from 'react';
import { ShoppingNote, ShoppingItem } from '@/app/types/shoppingNote';

// A sticky note's own per-note checklist has no concept of amount/unit/recipe
// source — that richness belongs to the synced shopping list (ShoppingItem)
// only, so it gets its own simple, local-only item shape.
interface NoteChecklistItem {
    id: string;
    text: string;
    checked: boolean;
}

interface StickyNote {
    id: number;
    title: string;
    text: string;
    color: keyof typeof COLORS;
    x: number;
    y: number;
    mode: 'note' | 'checklist';
    items: NoteChecklistItem[];
}

const EMPTY_SHOPPING_NOTE: ShoppingNote = { items: [], updatedAt: '' };

function fmtAmount(item: ShoppingItem): string {
    return [item.amount != null ? String(item.amount) : null, item.unit || null].filter(Boolean).join(' ');
}

function normalizeStickyNote(note: Partial<StickyNote> & { id: number }): StickyNote {
    return {
        title: 'New note',
        text: '',
        color: 'yellow',
        x: 50,
        y: 50,
        mode: 'note',
        items: [],
        ...note,
    };
}

// A stale nextId could previously hand out an id already in use by another
// note (fixed above), leaving two notes sharing one id in already-saved
// data. Since updates match by id, that pair could get silently stuck
// together. Collapse any such duplicates back down to one note per id.
function dedupeNotesById(notes: StickyNote[]): StickyNote[] {
    const byId = new Map<number, StickyNote>();
    for (const note of notes) byId.set(note.id, note);
    return Array.from(byId.values());
}

const COLORS = {
    yellow: { bg: '#FAC775', header: '#EF9F27', text: '#412402' },
    teal:   { bg: '#9FE1CB', header: '#5DCAA5', text: '#04342C' },
    blue:   { bg: '#B5D4F4', header: '#85B7EB', text: '#042C53' },
    pink:   { bg: '#F4C0D1', header: '#ED93B1', text: '#4B1528' },
    green:  { bg: '#C0DD97', header: '#97C459', text: '#173404' },
    gray:   { bg: '#D3D1C7', header: '#B4B2A9', text: '#2C2C2A' },
} as const;

export default function Notes() {
    // Computed once at mount: the loaded notes, plus the id to hand out next.
    // nextId must start past the highest id already in use (not a hardcoded
    // value) — otherwise a reload can hand a new note an id that collides
    // with an existing one, and since updates match by id, the two notes end
    // up silently sharing state (toggling one toggles both).
    const [initial] = useState(() => {
        const seed = [normalizeStickyNote({ id: 1, title: 'Welcome!', text: 'Move me around!' })];
        if (typeof window === 'undefined') return { notes: seed, nextId: 2 };
        const saved = localStorage.getItem('sticky-notes');
        // Older saved notes predate mode/items — normalize on load so they still render.
        const loaded = saved ? (JSON.parse(saved) as StickyNote[]).map(normalizeStickyNote) : seed;
        const notes = dedupeNotesById(loaded);
        const nextId = notes.reduce((max, n) => Math.max(max, n.id), 1) + 1;
        return { notes, nextId };
    });
    const [notes, setNotes] = useState<StickyNote[]>(initial.notes);
    const [selectedColor, setSelectedColor] = useState<keyof typeof COLORS>(
        () => {
            if (typeof window === 'undefined') return 'yellow';
            return (localStorage.getItem('sticky-color') as keyof typeof COLORS) ?? 'yellow';
        }
    );
    const [topZ, setTopZ] = useState(10);
    const nextId = useRef(initial.nextId);
    const boardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem('sticky-notes', JSON.stringify(notes));
    }, [notes]);
    useEffect(() => {
        localStorage.setItem('sticky-color', selectedColor);
    }, [selectedColor]);

    // ── Shopping note — synced with the server (and phone app) ──────────────
    const [shoppingNote, setShoppingNote] = useState<ShoppingNote>(EMPTY_SHOPPING_NOTE);
    const [newItem, setNewItem] = useState('');
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        fetch('/api/shopping-note')
            .then(r => r.json())
            .then(setShoppingNote)
            .catch(console.error);
    }, []);

    useEffect(() => {
        let cancelled = false;
        let reconnectTimer: ReturnType<typeof setTimeout>;

        const connect = () => {
            if (cancelled) return;
            const ws = new WebSocket(`ws://${window.location.hostname}:3000/api/recipes/ws`);

            ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (msg.type === 'shopping_note_updated') setShoppingNote(msg.note);
                } catch { /* ignore malformed message */ }
            };

            ws.onclose = () => { if (!cancelled) reconnectTimer = setTimeout(connect, 5000); };
            ws.onerror = () => ws.close();
        };

        connect();
        return () => { cancelled = true; clearTimeout(reconnectTimer); };
    }, []);

    const patchShoppingNote = (patch: Partial<ShoppingNote>) => {
        setShoppingNote(prev => {
            const next = { ...prev, ...patch };
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => {
                fetch('/api/shopping-note', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(next),
                }).catch(console.error);
            }, 500);
            return next;
        });
    };

    const addShoppingItem = () => {
        const name = newItem.trim();
        if (!name) return;
        patchShoppingNote({
            items: [...shoppingNote.items, {
                id: crypto.randomUUID(), name, amount: null, unit: '', checked: false, recipeTitles: [],
            }],
        });
        setNewItem('');
    };

    const toggleShoppingItem = (id: string) =>
        patchShoppingNote({ items: shoppingNote.items.map(i => i.id === id ? { ...i, checked: !i.checked } : i) });

    const removeShoppingItem = (id: string) =>
        patchShoppingNote({ items: shoppingNote.items.filter(i => i.id !== id) });


    const addNote = () => {
        setNotes(prev => [...prev, normalizeStickyNote({
        id: nextId.current++,
        color: selectedColor,
        x: Math.random() * 200 + 20,
        y: Math.random() * 150 + 20,
        })]);
    };

    const deleteNote = (id: number) => setNotes(prev => prev.filter(n => n.id !== id));
    const updateNote = (id: number, patch: Partial<StickyNote>) =>
        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));

    const addNoteItem = (id: number, text: string) => {
        const value = text.trim();
        if (!value) return;
        setNotes(prev => prev.map(n => n.id === id
            ? { ...n, items: [...n.items, { id: crypto.randomUUID(), text: value, checked: false }] }
            : n));
    };

    const toggleNoteItem = (noteId: number, itemId: string) =>
        setNotes(prev => prev.map(n => n.id === noteId
            ? { ...n, items: n.items.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i) }
            : n));

    const removeNoteItem = (noteId: number, itemId: string) =>
        setNotes(prev => prev.map(n => n.id === noteId
            ? { ...n, items: n.items.filter(i => i.id !== itemId) }
            : n));

    const startDrag = useCallback((e: React.MouseEvent, note: StickyNote) => {
        if ((e.target as HTMLElement).closest('button, input, textarea')) return;
        e.preventDefault();
        const startX = e.clientX, startY = e.clientY;
        const startLeft = note.x, startTop = note.y;
        const board = boardRef.current!;
        setTopZ(z => z + 1);

        const onMove = (ev: MouseEvent) => {
        const bw = board.clientWidth, bh = board.clientHeight;
        updateNote(note.id, {
            x: Math.max(0, Math.min(startLeft + ev.clientX - startX, bw - 210)),
            y: Math.max(0, Math.min(startTop + ev.clientY - startY, bh - 150)),
        });
        };
        const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, []);


    return (
        <div className="notes">
            <div className="notes-shopping">
                <div className="notes-shopping-header">
                    <span className="notes-shopping-title">Shopping</span>
                </div>

                <div className="notes-shopping-list">
                    {shoppingNote.items.map(item => (
                        <div
                            key={item.id}
                            className={`notes-shopping-item ${item.checked ? 'checked' : ''}`}
                            onClick={() => toggleShoppingItem(item.id)}
                        >
                            <input type="checkbox" checked={item.checked} readOnly />
                            <div className="notes-shopping-item-text">
                                <span>{fmtAmount(item) ? `${fmtAmount(item)} ` : ''}{item.name}</span>
                                {item.recipeTitles.length > 0 && (
                                    <span className="notes-shopping-item-source">{item.recipeTitles.join(', ')}</span>
                                )}
                            </div>
                            <button onClick={e => { e.stopPropagation(); removeShoppingItem(item.id); }}><CloseIcon /></button>
                        </div>
                    ))}
                    {shoppingNote.items.length === 0 && (
                        <div className="notes-shopping-empty">No items yet</div>
                    )}
                </div>
                <div className="notes-shopping-add">
                    <input
                        value={newItem}
                        onChange={e => setNewItem(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addShoppingItem(); }}
                        placeholder="Add item..."
                    />
                    <button onClick={addShoppingItem}><AddIcon /></button>
                </div>
            </div>

            <div className="notes-main">
                <div className="notes-toolbar">
                    <button
                        onClick={addNote}
                        className="add-note-btn"
                        title="Add Note"
                        ><AddIcon /> Add note
                    </button>
                    {(Object.keys(COLORS) as (keyof typeof COLORS)[]).map(color => (
                    <div
                        key={color}
                        className={`color-dot ${selectedColor === color ? 'active' : ''}`}
                        style={{ background: COLORS[color].bg }}
                        onClick={() => setSelectedColor(color)}
                    />
                    ))}
                </div>
                <div className="notes-board" ref={boardRef}>
                    {notes.map(note => {
                    const c = COLORS[note.color];
                    return (
                        <div
                        key={note.id}
                        className="sticky"
                        style={{ left: note.x, top: note.y, background: c.bg }}
                        onMouseDown={e => startDrag(e, note)}
                        >
                        <div className="sticky-header" style={{ background: c.header }}>
                            <input
                            value={note.title}
                            style={{ color: c.text }}
                            onChange={e => updateNote(note.id, { title: e.target.value })}
                            />
                            <button
                                onClick={() => updateNote(note.id, { mode: note.mode === 'checklist' ? 'note' : 'checklist' })}
                                style={{ color: c.text }}
                                title={note.mode === 'checklist' ? 'Switch to note' : 'Switch to checklist'}
                            >{note.mode === 'checklist' ? 'Aa' : '☑'}</button>
                            <button onClick={() => deleteNote(note.id)} style={{ color: c.text }}><CloseIcon /></button>
                        </div>
                        {note.mode === 'checklist' ? (
                            <div className="sticky-checklist">
                                {note.items.map(item => (
                                    <div
                                        key={item.id}
                                        className={`sticky-checklist-item ${item.checked ? 'checked' : ''}`}
                                        style={{ color: c.text }}
                                        onClick={() => toggleNoteItem(note.id, item.id)}
                                    >
                                        <input type="checkbox" checked={item.checked} readOnly />
                                        <span>{item.text}</span>
                                        <button onClick={e => { e.stopPropagation(); removeNoteItem(note.id, item.id); }} style={{ color: c.text }}><CloseIcon /></button>
                                    </div>
                                ))}
                                <input
                                    className="sticky-checklist-add"
                                    style={{ color: c.text }}
                                    placeholder="Add item..."
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            addNoteItem(note.id, e.currentTarget.value);
                                            e.currentTarget.value = '';
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            <textarea
                                value={note.text}
                                style={{ color: c.text }}
                                onChange={e => updateNote(note.id, { text: e.target.value })}
                                placeholder="Type here..."
                            />
                        )}
                        </div>
                    );
                    })}
                </div>
            </div>
        </div>
    );
}