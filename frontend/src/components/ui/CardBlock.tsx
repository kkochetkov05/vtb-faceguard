import { type ReactNode } from "react";

interface CardBlockProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function CardBlock({
  title,
  subtitle,
  action,
  children,
  className = "",
  noPadding = false,
}: CardBlockProps) {
  return (
    <div className={`vtb-card ${className}`}>
      {(title || action) && (
        <div className={`flex items-start justify-between gap-4 ${noPadding ? "" : "mb-4"}`}>
          <div>
            {title && <h3 className="text-base font-semibold text-vtb-navy">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-vtb-secondary">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? "-mx-5 -mb-5" : ""}>{children}</div>
    </div>
  );
}
