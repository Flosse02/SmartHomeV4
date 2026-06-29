interface StyledButtonProps {
  placeholder?: string | React.ReactNode;
  disabled?: boolean;
  primaryColour?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  changeColour?: boolean;
  onPress?: (value: string) => void;
}

export function StyledButton({
  placeholder,
  disabled = false,
  primaryColour = false,
  prefix,
  suffix,
  onPress,
}: StyledButtonProps) {
  return (
    <div
      className={`styled-button ${primaryColour ? 'styled-button--primary' : ''} ${disabled ? 'is-disabled' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onPress?.(typeof placeholder === 'string' ? placeholder : '');
        }
      }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          onPress?.(typeof placeholder === 'string' ? placeholder : '');
        }
      }}
    >
      {prefix && <span style={{ marginRight: '0.5rem' }}>{prefix}</span>}
      
      <span className="button-text">
        {placeholder || 'Button'}
      </span>

      {suffix && <span style={{ marginLeft: '0.5rem' }}>{suffix}</span>}
    </div>
  );
}