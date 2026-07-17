interface StyledButtonProps {
  placeholder?: string | React.ReactNode;
  disabled?: boolean;
  primaryColour?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  changeColour?: boolean;
  colour?: string;
  onPress?: (value: string) => void;
}

export function StyledButton({
  placeholder,
  disabled = false,
  primaryColour = false,
  prefix,
  suffix,
  colour,
  onPress,
}: StyledButtonProps) {
  return (
    <button
      type="button"
      className={`styled-button ${primaryColour ? 'styled-button--primary' : ''} ${disabled ? 'is-disabled' : ''}`}
      disabled={disabled}
      onClick={() => onPress?.(typeof placeholder === 'string' ? placeholder : '')}
      style={{background: colour}}
    >
      {prefix && <span style={{ marginRight: '0.5rem' }}>{prefix}</span>}

      <span className="button-text">
        {placeholder || 'Button'}
      </span>

      {suffix && <span style={{ marginLeft: '0.5rem' }}>{suffix}</span>}
    </button>
  );
}