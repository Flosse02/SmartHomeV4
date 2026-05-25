interface StyledButtonProps {
  placeholder?: string | React.ReactNode;
  disabled?: boolean;
  onPress?: (value: string) => void;
}

export function StyledButton({
  placeholder,
  disabled = false,
  onPress,
}: StyledButtonProps) {
  return (
    <div>
      <button 
        className="button"
        disabled={disabled}
        onClick={() => onPress && onPress(typeof placeholder === 'string' ? placeholder : '')}>
        {placeholder || 'Button'}
      </button>
    </div>
  );
}