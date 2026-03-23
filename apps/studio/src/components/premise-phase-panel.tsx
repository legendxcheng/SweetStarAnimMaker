import type { ProjectDetail } from "@sweet-star/shared";
import { StatusBadge } from "./status-badge";

interface PremisePhasePanelProps {
  project: ProjectDetail;
}

export function PremisePhasePanel({ project }: PremisePhasePanelProps) {
  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";

  return (
    <section aria-label="前提工作区">
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-(--color-text-primary)">前提工作区</h3>
            <p className="text-sm text-(--color-text-muted) mt-1">
              查看当前项目基础信息与前提素材。
            </p>
          </div>
          <StatusBadge status={project.status} />
        </div>

        <div className="grid gap-3">
          <div>
            <p className={metaLabelClass}>项目 ID</p>
            <p className={`${metaValueClass} font-mono text-xs`}>{project.id}</p>
          </div>
          <div>
            <p className={metaLabelClass}>别名</p>
            <p className={metaValueClass}>{project.slug}</p>
          </div>
          <div>
            <p className={metaLabelClass}>项目前提</p>
            <p className={metaValueClass}>
              {project.premise.path}{" "}
              <span className="text-(--color-text-muted)">({project.premise.bytes} 字节)</span>
            </p>
          </div>
          <div>
            <p className={metaLabelClass}>Premise 文本</p>
            <div className="mt-1 rounded-xl border border-(--color-border) bg-(--color-bg-elevated) px-4 py-3 text-sm leading-6 text-(--color-text-primary) whitespace-pre-wrap">
              {project.premise.text}
            </div>
          </div>
          <div>
            <p className={metaLabelClass}>创建时间</p>
            <p className={metaValueClass}>{new Date(project.createdAt).toLocaleString("zh-CN")}</p>
          </div>
          <div>
            <p className={metaLabelClass}>更新时间</p>
            <p className={metaValueClass}>{new Date(project.updatedAt).toLocaleString("zh-CN")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
