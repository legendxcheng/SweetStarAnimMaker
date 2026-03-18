interface StatusBadgeProps {
  status: string;
}

const statusColors: Record<string, string> = {
  script_ready: "#2196F3",
  storyboard_generating: "#FF9800",
  storyboard_in_review: "#9C27B0",
  storyboard_approved: "#4CAF50",
};

const statusLabels: Record<string, string> = {
  script_ready: "Script Ready",
  storyboard_generating: "Generating",
  storyboard_in_review: "In Review",
  storyboard_approved: "Approved",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = statusColors[status] || "#757575";
  const label = statusLabels[status] || status;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.25rem 0.75rem",
        borderRadius: "1rem",
        fontSize: "0.875rem",
        fontWeight: 500,
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {label}
    </span>
  );
}
