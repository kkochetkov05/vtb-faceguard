interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full
        transition-colors duration-200 focus:outline-none focus:ring-2
        focus:ring-vtb-primary/30 focus:ring-offset-2
        disabled:opacity-40 disabled:cursor-not-allowed
        ${checked ? "bg-vtb-primary" : "bg-vtb-border"}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}
