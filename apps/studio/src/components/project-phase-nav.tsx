interface ProjectPhaseNavItem<TPhaseKey extends string> {
  key: TPhaseKey;
  label: string;
  enabled: boolean;
}

interface ProjectPhaseNavProps<TPhaseKey extends string> {
  phases: readonly ProjectPhaseNavItem<TPhaseKey>[];
  selectedPhase: TPhaseKey;
  onSelect: (phaseKey: TPhaseKey) => void;
}

export function ProjectPhaseNav<TPhaseKey extends string>({
  phases,
  selectedPhase,
  onSelect,
}: ProjectPhaseNavProps<TPhaseKey>) {
  return (
    <nav
      aria-label="项目阶段"
      className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-3 h-fit lg:sticky lg:top-6 lg:self-start"
    >
      <div className="mb-2 px-2 text-xs font-semibold tracking-wide text-(--color-text-muted)">
        项目阶段
      </div>
      <div className="grid gap-1.5">
        {phases.map((phase) => {
          const isActive = phase.key === selectedPhase;
          return (
            <button
              key={phase.key}
              type="button"
              disabled={!phase.enabled}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelect(phase.key)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-(--color-accent)/10 text-(--color-accent) border border-(--color-accent)/30 font-semibold"
                  : phase.enabled
                    ? "text-(--color-text-primary) hover:bg-(--color-bg-elevated) border border-transparent"
                    : "text-(--color-text-muted) opacity-60 cursor-not-allowed border border-transparent"
              }`}
            >
              {phase.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
