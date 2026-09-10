import { useState, useMemo, useRef, useEffect } from "react";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectPickerProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
}

export function MultiSelectPicker({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  searchable = true,
}: MultiSelectPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return options;
    return options.filter(o =>
      o.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, query]);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedInOptions = selected.filter(v => options.some(o => o.value === v));

    const summary =
    selectedInOptions.length === 0
        ? placeholder
        : selectedInOptions.length === 1
        ? options.find(o => o.value === selectedInOptions[0])?.label
        : `${selectedInOptions.length} selected`;


  return (
    <div className="multiselect-wrapper" ref={ref}>
      <div className="select" onClick={() => setOpen(o => !o)}>
        {summary}
        <span>▾</span>
      </div>

      {open && (
        <div className="select-dropdown">
          {searchable && (
            <input
              className="select-search"
              autoFocus
              placeholder="Search..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          )}

          {filtered.length === 0 && (
            <div className="select-empty">No matches</div>
          )}

          {filtered.map(opt => {
            const isSelected = selected.includes(opt.value);
            return (
              <div
                key={opt.value}
                className={`select-option ${isSelected ? "select-option-selected" : ""}`}
                onClick={() => toggle(opt.value)}
              >
                <span className="checkmark">{isSelected ? "✓" : ""}</span>
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}