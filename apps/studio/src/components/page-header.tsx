import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>{title}</h2>
      {actions && <div>{actions}</div>}
    </div>
  );
}
