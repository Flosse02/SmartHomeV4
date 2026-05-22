'use client';

import { useEffect, useState } from 'react';

interface Note {
  name: string;
  title?: string;
  body?: { text?: { text: string } };
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);

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


  return (
    <div className="notes">
      <h2>Notes - Google Keep integration is only available for enterprise accounts, so this feature is not functional unless you have an enterprise account :(</h2>
      <div className="note-input">
        <textarea placeholder="New note content..." />
      </div>
      
      {/* {notes.map((note) => (
        <div key={note.name}>
          <strong>{note.title ?? 'Untitled'}</strong>
          <p>{note.body?.text?.text}</p>
        </div>
      ))} */}
    </div>
  );
}