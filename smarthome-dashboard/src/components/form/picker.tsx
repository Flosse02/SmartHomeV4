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
    <div className="select-wrapper">
      <div
        className="select"
        onClick={() => setOpen(o => !o)}
      >
        {options.find(o => o.value === value)?.label ?? value}
        <span>▾</span>
      </div>

      {open && (
        <div className="select-dropdown">
          {options.map(opt => (
            <div
              key={opt.value}
              className="select-option"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}