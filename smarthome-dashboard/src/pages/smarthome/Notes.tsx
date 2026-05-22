'use client';

import { AddIcon, CloseIcon } from '@/lib/icons';
import { useState, useRef, useCallback, useEffect } from 'react';

interface StickyNote {
    id: number;
    title: string;
    text: string;
    color: keyof typeof COLORS;
    x: number;
    y: number;
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
    const [notes, setNotes] = useState<StickyNote[]>(() => {
        if (typeof window === 'undefined') return [
            { id: 1, title: 'Welcome!', text: 'Move me around!', color: 'yellow', x: 50, y: 50 },
        ];
        const saved = localStorage.getItem('sticky-notes');
        return saved ? JSON.parse(saved) : [
            { id: 1, title: 'Welcome!', text: 'Move me around!', color: 'yellow', x: 50, y: 50 },
        ];
    });
    const [selectedColor, setSelectedColor] = useState<keyof typeof COLORS>(
        () => {
            if (typeof window === 'undefined') return 'yellow';
            return (localStorage.getItem('sticky-color') as keyof typeof COLORS) ?? 'yellow';
        }
    );
    const [topZ, setTopZ] = useState(10);
    const nextId = useRef(2);
    const boardRef = useRef<HTMLDivElement>(null);
    

//   useEffect(() => {
//   fetch('/api/notes')
//     .then((r) => r.json())
//     .then((data) => {
//       if (Array.isArray(data)) {
//         setNotes(data);
//       } else {
//         console.error("Notes API error:", data.error);
//         setNotes([]);
//       }
//     })
//     .catch(console.error);
// }, []);

    useEffect(() => {
        localStorage.setItem('sticky-notes', JSON.stringify(notes));
    }, [notes]);
    useEffect(() => {
        localStorage.setItem('sticky-color', selectedColor);
    }, [selectedColor]);


    const addNote = () => {
        setNotes(prev => [...prev, {
        id: nextId.current++,
        title: 'New note', text: '',
        color: selectedColor,
        x: Math.random() * 200 + 20,
        y: Math.random() * 150 + 20,
        }]);
    };

    const deleteNote = (id: number) => setNotes(prev => prev.filter(n => n.id !== id));
    const updateNote = (id: number, patch: Partial<StickyNote>) =>
        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));

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
                        <button onClick={() => deleteNote(note.id)} style={{ color: c.text }}><CloseIcon /></button>
                    </div>
                    <textarea
                        value={note.text}
                        style={{ color: c.text }}
                        onChange={e => updateNote(note.id, { text: e.target.value })}
                        placeholder="Type here..."
                    />
                    </div>
                );
                })}
            </div>
        </div>
    );
}
      
      {/* {notes.map((note) => (
        <div key={note.name}>
          <strong>{note.title ?? 'Untitled'}</strong>
          <p>{note.body?.text?.text}</p>
        </div>
      ))} */}