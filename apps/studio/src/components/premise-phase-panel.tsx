import { useEffect, useState } from "react";

import type { ProjectDetail } from "@sweet-star/shared";
import { StatusBadge } from "./status-badge";

interface PremisePhasePanelProps {
  project: ProjectDetail;
  resetting?: boolean;
  onReset?: (input: {
    premiseText: string;
    visualStyleText?: string;
    confirmReset: true;
  }) => Promise<void>;
}

export function PremisePhasePanel({
  project,
  resetting = false,
  onReset,
}: PremisePhasePanelProps) {
  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";
  const inputClass =
    "mt-1 w-full rounded-xl border border-(--color-border) bg-(--color-bg-elevated) px-4 py-3 text-sm leading-6 text-(--color-text-primary) outline-none focus:border-(--color-accent)";
  const [premiseText, setPremiseText] = useState(project.premise.text);
  const [visualStyleText, setVisualStyleText] = useState(project.premise.visualStyleText ?? "");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setPremiseText(project.premise.text);
    setVisualStyleText(project.premise.visualStyleText ?? "");
    setSubmitError(null);
  }, [project.id, project.premise.text, project.premise.visualStyleText, project.updatedAt]);

  const handleReset = async () => {
    if (!onReset || resetting) {
      return;
    }

    const nextPremiseText = premiseText.trim();
    const nextVisualStyleText = visualStyleText.trim();

    if (!nextPremiseText) {
      setSubmitError("Premise 文本不能为空。");
      return;
    }

    const confirmed = window.confirm(
      "此操作会删除当前项目的主情节、角色设定、分镜、镜头脚本、画面、视频以及相关任务记录，并将项目重置为仅保留新的前提。是否继续？",
    );

    if (!confirmed) {
      return;
    }

    try {
      setSubmitError(null);
      await onReset({
        premiseText: nextPremiseText,
        visualStyleText: nextVisualStyleText,
        confirmReset: true,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "重置项目失败。");
    }
  };

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
            <label htmlFor="premise-text" className={metaLabelClass}>
              Premise 文本
            </label>
            <textarea
              id="premise-text"
              className={`${inputClass} min-h-40 resize-y`}
              value={premiseText}
              onChange={(event) => setPremiseText(event.target.value)}
              disabled={resetting}
            />
          </div>
          <div>
            <label htmlFor="visual-style-text" className={metaLabelClass}>
              画面风格描述
            </label>
            <textarea
              id="visual-style-text"
              className={`${inputClass} min-h-28 resize-y`}
              value={visualStyleText}
              onChange={(event) => setVisualStyleText(event.target.value)}
              disabled={resetting}
            />
          </div>
          <div>
            <p className={metaLabelClass}>创建时间</p>
            <p className={metaValueClass}>{new Date(project.createdAt).toLocaleString("zh-CN")}</p>
          </div>
          <div>
            <p className={metaLabelClass}>更新时间</p>
            <p className={metaValueClass}>{new Date(project.updatedAt).toLocaleString("zh-CN")}</p>
          </div>
          {submitError ? (
            <div className="rounded-xl border border-(--color-danger)/30 bg-(--color-danger)/10 px-4 py-3 text-sm text-(--color-danger)">
              {submitError}
            </div>
          ) : null}
          <div>
            <button
              type="button"
              className="rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 bg-gradient-to-r from-(--color-warning) to-(--color-warning-end) text-(--color-bg-base) hover:opacity-90 transition-opacity"
              onClick={() => {
                void handleReset();
              }}
              disabled={resetting || !premiseText.trim()}
            >
              {resetting ? "重置中..." : "重新输入前提并重置项目"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
