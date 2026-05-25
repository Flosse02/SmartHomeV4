interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export function Toggle({ value, onChange, label }: ToggleProps) {
  return (
    <div className="toggle-wrap">
      <label className="toggle">
        <input
          type="checkbox"
          checked={value}
          onChange={e => onChange(e.target.checked)}
        />
        <div className="toggle-track" />
      </label>
      {label && <span className="toggle-label">{label}</span>}
    </div>
  );
}