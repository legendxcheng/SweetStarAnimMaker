import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-5 mb-6 border-b border-(--color-border)">
      <div>
        <h2 className="text-xl font-semibold text-(--color-text-primary)">{title}</h2>
        {subtitle && (
          <p className="text-sm text-(--color-text-muted) mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}
