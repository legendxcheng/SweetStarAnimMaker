interface EmptyStateProps {
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "3rem 1rem",
        color: "#757575",
      }}
    >
      <p style={{ fontSize: "1rem", marginBottom: "1rem" }}>{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
