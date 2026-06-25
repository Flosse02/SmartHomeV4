interface ToggleProps {
  icon?: React.ReactNode;
  label?: string;
  active: boolean;
  onToggle: () => void;
}

export function ToggleSwitch({ icon, label, active, onToggle }: ToggleProps) {
  return (
    <div className="toggle-switch">
      <span className="toggle-switch-icon">{icon}</span>
      <span className="toggle-switch-label">{label}</span>
      <button
        className={`toggle ${active ? 'toggle--on' : 'toggle--off'}`}
        onClick={e => onToggle()}
        aria-label={`Toggle ${label}`}
      />
    </div>
  );
}