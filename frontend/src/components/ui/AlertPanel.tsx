import { type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";

type Variant = "success" | "warning" | "danger" | "info";

const config: Record<Variant, { bg: string; border: string; icon: typeof Info }> = {
  success: { bg: "bg-vtb-success/5", border: "border-vtb-success/20", icon: CheckCircle2 },
  warning: { bg: "bg-vtb-warning/5", border: "border-vtb-warning/20", icon: AlertTriangle },
  danger:  { bg: "bg-vtb-danger/5",  border: "border-vtb-danger/20",  icon: XCircle },
  info:    { bg: "bg-vtb-primary/5",  border: "border-vtb-primary/20", icon: Info },
};

interface AlertPanelProps {
  variant: Variant;
  title: string;
  children?: ReactNode;
}

export default function AlertPanel({ variant, title, children }: AlertPanelProps) {
  const { bg, border, icon: Icon } = config[variant];

  return (
    <div className={`flex gap-3 rounded-vtb-sm border p-4 ${bg} ${border}`}>
      <Icon size={20} className="mt-0.5 shrink-0 text-current opacity-70" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {children && <div className="mt-1 text-sm text-vtb-secondary">{children}</div>}
      </div>
    </div>
  );
}
