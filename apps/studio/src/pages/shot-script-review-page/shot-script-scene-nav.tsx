type ShotScriptSceneNavProps = {
  sceneIds: string[];
  activeSceneId: string | null;
  sceneSegmentCounts: Map<string, number>;
  onSelectScene: (sceneId: string) => void;
};

export function ShotScriptSceneNav({
  sceneIds,
  activeSceneId,
  sceneSegmentCounts,
  onSelectScene,
}: ShotScriptSceneNavProps) {
  if (sceneIds.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Scene 导航"
      className="shrink-0 rounded-xl bg-(--color-bg-surface) border border-(--color-border) p-1.5 flex gap-1 overflow-x-auto overflow-y-hidden"
    >
      {sceneIds.map((sceneId) => {
        const isActive = sceneId === activeSceneId;
        const count = sceneSegmentCounts.get(sceneId) ?? 0;

        return (
          <button
            key={sceneId}
            type="button"
            onClick={() => onSelectScene(sceneId)}
            className={[
              "relative shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200",
              isActive
                ? "bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) shadow-sm"
                : "text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-bg-elevated)",
            ].join(" ")}
          >
            {sceneId}
            <span
              className={[
                "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none min-w-5",
                isActive
                  ? "bg-(--color-bg-base)/20 text-(--color-bg-base)"
                  : "bg-(--color-border-muted) text-(--color-text-muted)",
              ].join(" ")}
            >
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
