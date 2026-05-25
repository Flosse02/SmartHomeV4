import { useState } from "react";

interface InputBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export function InputBar({ placeholder, value, onChange }: InputBarProps) {
    return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: '2px', borderRadius: 4, border: '1px solid #ccc', width: '100%' }}
      />
      
    </div>
  );
}
