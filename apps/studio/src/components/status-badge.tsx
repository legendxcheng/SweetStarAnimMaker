interface StatusBadgeProps {
  status: string;
}

type StatusConfig = {
  label: string;
  dotClass: string;
  pillClass: string;
  pulse?: boolean;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  premise_ready: {
    label: "Premise Ready",
    dotClass: "bg-(--color-info)",
    pillClass: "bg-(--color-info)/10 border-(--color-info)/30 text-(--color-info)",
  },
  master_plot_generating: {
    label: "Generating",
    dotClass: "bg-(--color-warning)",
    pillClass: "bg-(--color-warning)/10 border-(--color-warning)/30 text-(--color-warning)",
    pulse: true,
  },
  master_plot_in_review: {
    label: "In Review",
    dotClass: "bg-(--color-accent)",
    pillClass: "bg-(--color-accent)/10 border-(--color-accent)/30 text-(--color-accent)",
  },
  master_plot_approved: {
    label: "Approved",
    dotClass: "bg-(--color-success)",
    pillClass: "bg-(--color-success)/10 border-(--color-success)/30 text-(--color-success)",
  },
};

const FALLBACK_CONFIG: StatusConfig = {
  label: "",
  dotClass: "bg-(--color-text-muted)",
  pillClass: "bg-(--color-bg-elevated) border-(--color-border) text-(--color-text-muted)",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? FALLBACK_CONFIG;
  const label = config.label || status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.pillClass}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass} ${config.pulse ? "animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}
