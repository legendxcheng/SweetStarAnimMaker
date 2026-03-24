import type { ProjectDetail, TaskDetail } from "@sweet-star/shared";
import { Link } from "react-router-dom";

import { ErrorState } from "./error-state";
import { getButtonClassName } from "../styles/button-styles";

const TASK_STATUS_LABELS: Record<TaskDetail["status"], string> = {
  pending: "排队中",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
};

interface MasterPlotPhasePanelProps {
  project: ProjectDetail;
  task: TaskDetail | null;
  taskError: Error | null;
  creatingTask: boolean;
  disableGenerate: boolean;
  onGenerate: () => void;
}

function formatCharacters(characters: string[]) {
  return characters.length > 0 ? characters.join("，") : "暂无";
}

function formatDuration(durationSec: number | null) {
  return durationSec === null ? "未设置" : `${durationSec} 秒`;
}

export function MasterPlotPhasePanel({
  project,
  task,
  taskError,
  creatingTask,
  disableGenerate,
  onGenerate,
}: MasterPlotPhasePanelProps) {
  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";

  return (
    <section aria-label="主情节工作区">
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-(--color-text-primary)">主情节工作区</h3>
            <p className="text-sm text-(--color-text-muted) mt-1">
              查看当前主情节内容，并在需要时进入本环节审核。
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={disableGenerate}
            className={getButtonClassName()}
          >
            {creatingTask ? "启动中..." : "重新生成"}
          </button>
        </div>
      </div>

      {task && (
        <div className={cardClass}>
          <h4 className="text-base font-semibold text-(--color-text-primary) mb-3">任务状态</h4>
          <div className="grid gap-2">
            <div>
              <p className={metaLabelClass}>任务 ID</p>
              <p className={`${metaValueClass} font-mono text-xs`}>{task.id}</p>
            </div>
            <div>
              <p className={metaLabelClass}>状态</p>
              <p className={metaValueClass}>{TASK_STATUS_LABELS[task.status]}</p>
            </div>
            <div>
              <p className={metaLabelClass}>更新时间</p>
              <p className={metaValueClass}>{new Date(task.updatedAt).toLocaleString("zh-CN")}</p>
            </div>
            {task.errorMessage && <p className="text-sm text-(--color-danger)">{task.errorMessage}</p>}
          </div>
        </div>
      )}

      {taskError && task && (
        <div className="mb-4">
          <ErrorState error={taskError} />
        </div>
      )}

      {project.status === "master_plot_generating" && !task && (
        <div className="bg-(--color-warning)/10 border border-(--color-warning)/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-(--color-warning)">主情节生成中，正在自动刷新项目状态。</p>
        </div>
      )}

      {project.currentMasterPlot && (
        <div className={cardClass}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <h4 className="text-base font-semibold text-(--color-text-primary)">当前主情节</h4>
            {project.status === "master_plot_in_review" && (
              <Link
                to={`/projects/${project.id}/master-plot/review`}
                className={`inline-flex items-center no-underline ${getButtonClassName()}`}
              >
                进入主情节审核 →
              </Link>
            )}
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="grid gap-4">
              <div>
                <p className={metaLabelClass}>标题</p>
                <p className={`${metaValueClass} text-base font-semibold`}>
                  {project.currentMasterPlot.title ?? "未命名"}
                </p>
              </div>
              <div>
                <p className={metaLabelClass}>一句话梗概</p>
                <p className={`${metaValueClass} leading-7`}>{project.currentMasterPlot.logline}</p>
              </div>
              <div>
                <p className={metaLabelClass}>主要角色</p>
                <p className={metaValueClass}>
                  {formatCharacters(project.currentMasterPlot.mainCharacters)}
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <p className={metaLabelClass}>剧情简介</p>
                <p className={`${metaValueClass} leading-7`}>{project.currentMasterPlot.synopsis}</p>
              </div>
              <div>
                <p className={metaLabelClass}>核心冲突</p>
                <p className={`${metaValueClass} leading-7`}>
                  {project.currentMasterPlot.coreConflict}
                </p>
              </div>
              <div>
                <p className={metaLabelClass}>情感弧光</p>
                <p className={`${metaValueClass} leading-7`}>
                  {project.currentMasterPlot.emotionalArc}
                </p>
              </div>
              <div>
                <p className={metaLabelClass}>结局落点</p>
                <p className={`${metaValueClass} leading-7`}>{project.currentMasterPlot.endingBeat}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <p className={metaLabelClass}>目标时长</p>
              <p className={metaValueClass}>
                {formatDuration(project.currentMasterPlot.targetDurationSec)}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>更新时间</p>
              <p className={metaValueClass}>
                {new Date(project.currentMasterPlot.updatedAt).toLocaleString("zh-CN")}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
