import { type ReactNode } from "react";

type Variant = "success" | "warning" | "danger" | "info" | "neutral";

const variantStyles: Record<Variant, string> = {
  success: "bg-vtb-success/10 text-vtb-success",
  warning: "bg-vtb-warning/10 text-vtb-warning",
  danger: "bg-vtb-danger/10 text-vtb-danger",
  info: "bg-vtb-primary/10 text-vtb-primary",
  neutral: "bg-vtb-bg text-vtb-secondary",
};

interface StatusChipProps {
  variant?: Variant;
  children: ReactNode;
  dot?: boolean;
}

export default function StatusChip({
  variant = "neutral",
  children,
  dot = false,
}: StatusChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${variantStyles[variant]}`}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}
