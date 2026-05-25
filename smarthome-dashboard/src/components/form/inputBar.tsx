interface InputBarProps {
  placeholder?: string;
  value: string;
  type?: string;
  suffix?: string;
  onChange: (value: string) => void;
}

export function InputBar({
  placeholder,
  value,
  type,
  suffix,
  onChange,
}: InputBarProps) {
  return (
    <div className="input-wrapper">
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {suffix && <span className="input-suffix">{suffix}</span>}
    </div>
  );
}