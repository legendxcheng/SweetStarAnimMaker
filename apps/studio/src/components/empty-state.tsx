import { ReactNode } from "react";

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <p className="text-sm text-(--color-text-muted) mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
