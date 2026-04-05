import { type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface FeatureRowProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onClick?: () => void;
  arrow?: boolean;
}

export default function FeatureRow({
  icon,
  title,
  subtitle,
  right,
  onClick,
  arrow = false,
}: FeatureRowProps) {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-vtb-sm px-4 py-3 text-left
        transition-colors ${onClick ? "hover:bg-vtb-bg cursor-pointer" : ""}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-vtb-xs bg-vtb-light text-vtb-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-vtb-text">{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-xs text-vtb-secondary">{subtitle}</p>}
      </div>
      {right}
      {arrow && <ChevronRight size={16} className="shrink-0 text-vtb-secondary" />}
    </Comp>
  );
}
