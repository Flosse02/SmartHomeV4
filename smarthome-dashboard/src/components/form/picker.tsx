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
    <div className="settings-select-wrapper">
      <div
        className="settings-select"
        onClick={() => setOpen(o => !o)}
      >
        {options.find(o => o.value === value)?.label ?? value}
        <span>▾</span>
      </div>

      {open && (
        <div className="settings-select-dropdown">
          {options.map(opt => (
            <div
              key={opt.value}
              className="settings-select-option"
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