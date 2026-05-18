import { useState } from "react";

interface PickerOption {
  value: string;
  label: string;
}

interface PickerProps {
  options: PickerOption[];
  value: string;
  onChange: (value: string) => void;
}

export function Picker({ options, value, onChange }: PickerProps) {
  const [open, setOpen] = useState(false);

    return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '3px 8px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
        {options.find(o => o.value === value)?.label ?? value} ▾
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#1e1e1e', borderRadius: 6, overflow: 'hidden', zIndex: 10, minWidth: '100%' }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{ padding: '4px 12px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11, background: value === opt.value ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
