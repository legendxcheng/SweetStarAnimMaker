import type { ProjectDetail, TaskDetail } from "@sweet-star/shared";

const TASK_STATUS_LABELS: Record<TaskDetail["status"], string> = {
  pending: "排队中",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
};

interface SceneSheetsPhasePanelProps {
  project: ProjectDetail;
  task: TaskDetail | null;
  taskError: Error | null;
}

export function SceneSheetsPhasePanel({
  project,
  task,
  taskError,
}: SceneSheetsPhasePanelProps) {
  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";
  const batch = project.currentSceneSheetBatch;

  return (
    <section aria-label="场景设定工作区">
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-(--color-text-primary)">场景设定工作区</h3>
            <p className="text-sm text-(--color-text-muted) mt-1">
              在正式生成分镜前，先沉淀项目级场景锚点，用来稳定环境空间、陈设与整体氛围。
            </p>
          </div>
        </div>

        {batch ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <p className={metaLabelClass}>场景数量</p>
              <p className={metaValueClass}>{batch.sceneCount}</p>
            </div>
            <div>
              <p className={metaLabelClass}>已通过</p>
              <p className={metaValueClass}>
                {batch.approvedSceneCount}/{batch.sceneCount}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>来源主情节</p>
              <p className={`${metaValueClass} font-mono text-xs`}>{batch.sourceMasterPlotId}</p>
            </div>
            <div>
              <p className={metaLabelClass}>更新时间</p>
              <p className={metaValueClass}>{new Date(batch.updatedAt).toLocaleString("zh-CN")}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-(--color-text-muted)">
            当前还没有场景设定批次。后续会在这里接入场景生成、编辑与审核。
          </p>
        )}
      </div>

      {project.status === "scene_sheets_generating" && !task && (
        <div className="bg-(--color-warning)/10 border border-(--color-warning)/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-(--color-warning)">场景设定生成中，正在自动刷新项目状态。</p>
        </div>
      )}

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
        <div className="p-4 rounded-lg border border-(--color-danger)/30 bg-(--color-danger)/10">
          <h4 className="text-sm font-semibold text-(--color-danger) mb-1">错误</h4>
          <p className="text-sm text-(--color-danger)/80">{taskError.message}</p>
        </div>
      )}
    </section>
  );
}
