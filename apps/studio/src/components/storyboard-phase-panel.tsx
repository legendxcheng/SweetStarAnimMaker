import type { ProjectDetail, TaskDetail } from "@sweet-star/shared";
import { Link } from "react-router-dom";

import { ErrorState } from "./error-state";

const TASK_STATUS_LABELS: Record<TaskDetail["status"], string> = {
  pending: "排队中",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
};

interface StoryboardPhasePanelProps {
  project: ProjectDetail;
  task: TaskDetail | null;
  taskError: Error | null;
  creatingTask: boolean;
  disableGenerate: boolean;
  onGenerate: () => void;
}

function formatDuration(durationSec: number | null) {
  return durationSec === null ? "未设置" : `${durationSec} 秒`;
}

export function StoryboardPhasePanel({
  project,
  task,
  taskError,
  creatingTask,
  disableGenerate,
  onGenerate,
}: StoryboardPhasePanelProps) {
  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";

  return (
    <section aria-label="分镜工作区">
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-(--color-text-primary)">分镜工作区</h3>
            <p className="text-sm text-(--color-text-muted) mt-1">
              基于已通过的主情节生成分镜文案、跟踪任务状态，并进入审核。
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={disableGenerate}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creatingTask ? "启动中..." : "生成分镜文案"}
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

      {project.status === "storyboard_generating" && !task && (
        <div className="bg-(--color-warning)/10 border border-(--color-warning)/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-(--color-warning)">分镜文案生成中，正在自动刷新项目状态。</p>
        </div>
      )}

      {project.currentStoryboard && (
        <div className={cardClass}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <h4 className="text-base font-semibold text-(--color-text-primary)">当前分镜文案</h4>
            {project.status === "storyboard_in_review" && (
              <Link
                to={`/projects/${project.id}/review`}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) hover:opacity-90 transition-opacity no-underline"
              >
                进入分镜审核 →
              </Link>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className={metaLabelClass}>标题</p>
              <p className={`${metaValueClass} text-base font-semibold`}>
                {project.currentStoryboard.title ?? "未命名"}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>集标题</p>
              <p className={metaValueClass}>
                {project.currentStoryboard.episodeTitle ?? "未命名"}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>场景数</p>
              <p className={metaValueClass}>{project.currentStoryboard.sceneCount}</p>
            </div>
            <div>
              <p className={metaLabelClass}>段落数</p>
              <p className={metaValueClass}>{project.currentStoryboard.segmentCount}</p>
            </div>
            <div>
              <p className={metaLabelClass}>总时长</p>
              <p className={metaValueClass}>
                {formatDuration(project.currentStoryboard.totalDurationSec)}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>更新时间</p>
              <p className={metaValueClass}>
                {new Date(project.currentStoryboard.updatedAt).toLocaleString("zh-CN")}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
