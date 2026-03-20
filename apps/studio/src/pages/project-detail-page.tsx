import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ProjectDetail, TaskDetail } from "@sweet-star/shared";
import { AsyncState } from "../components/async-state";
import { ErrorState } from "../components/error-state";
import { PageHeader } from "../components/page-header";
import { StatusBadge } from "../components/status-badge";
import { useTaskPolling } from "../hooks/use-task-polling";
import { apiClient } from "../services/api-client";

function isActiveTask(task: TaskDetail | null) {
  return task?.status === "pending" || task?.status === "running";
}

const TASK_STATUS_LABELS: Record<TaskDetail["status"], string> = {
  pending: "排队中",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
};

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTask, setActiveTask] = useState<TaskDetail | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);

  const loadProject = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getProjectDetail(projectId);
      setProject(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProject();
  }, [projectId]);

  useEffect(() => {
    if (project?.status !== "master_plot_generating" || activeTask) return;
    const interval = setInterval(() => {
      void loadProject();
    }, 3000);
    return () => {
      clearInterval(interval);
    };
  }, [project?.status, activeTask]);

  const polling = useTaskPolling({
    taskId: activeTask?.id ?? null,
    enabled: isActiveTask(activeTask),
    onTaskUpdate: setActiveTask,
    onTerminal: async () => {
      await loadProject();
    },
  });

  const task = polling.task ?? activeTask;
  const taskError = polling.error ?? error;

  const handleGenerateMasterPlot = async () => {
    if (!projectId || creatingTask || isActiveTask(task)) return;
    try {
      setCreatingTask(true);
      const nextTask = await apiClient.createMasterPlotGenerateTask(projectId);
      setActiveTask(nextTask);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setCreatingTask(false);
    }
  };

  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";

  return (
    <div>
      <AsyncState
        data={project}
        loading={loading}
        error={error}
        errorFallback={(err) => <ErrorState error={err} retry={loadProject} />}
      >
        {(currentProject) => (
          <>
            <PageHeader
              title={currentProject.name}
              actions={
                <Link
                  to="/projects"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-(--color-bg-elevated) text-(--color-text-primary) border border-(--color-border-muted) hover:border-(--color-text-muted) transition-colors no-underline"
                >
                  ← 返回项目列表
                </Link>
              }
            />

            <div className={cardClass}>
              <div className="mb-4">
                <StatusBadge status={currentProject.status} />
              </div>
              <div className="grid gap-3">
                <div>
                  <p className={metaLabelClass}>项目 ID</p>
                  <p className={`${metaValueClass} font-mono text-xs`}>{currentProject.id}</p>
                </div>
                <div>
                  <p className={metaLabelClass}>别名</p>
                  <p className={metaValueClass}>{currentProject.slug}</p>
                </div>
                <div>
                  <p className={metaLabelClass}>项目前提</p>
                  <p className={metaValueClass}>
                    {currentProject.premise.path}{" "}
                    <span className="text-(--color-text-muted)">
                      ({currentProject.premise.bytes} 字节)
                    </span>
                  </p>
                </div>
                <div>
                  <p className={metaLabelClass}>创建时间</p>
                  <p className={metaValueClass}>
                    {new Date(currentProject.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div>
                  <p className={metaLabelClass}>更新时间</p>
                  <p className={metaValueClass}>
                    {new Date(currentProject.updatedAt).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => {
                    void handleGenerateMasterPlot();
                  }}
                  disabled={creatingTask || isActiveTask(task)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {creatingTask ? "启动中..." : "生成主情节"}
                </button>
              </div>
            </div>

            {task && (
              <div className={cardClass}>
                <h3 className="text-base font-semibold text-(--color-text-primary) mb-3">
                  任务状态
                </h3>
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
                    <p className={metaValueClass}>
                      {new Date(task.updatedAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  {task.errorMessage && (
                    <p className="text-sm text-(--color-danger)">{task.errorMessage}</p>
                  )}
                </div>
              </div>
            )}

            {taskError && task && (
              <div className="mb-4">
                <ErrorState error={taskError} />
              </div>
            )}

            {currentProject.status === "master_plot_generating" && !task && (
              <div className="bg-(--color-warning)/10 border border-(--color-warning)/30 rounded-xl p-4 mb-4">
                <p className="text-sm text-(--color-warning)">
                  主情节生成中，正在自动刷新项目状态。
                </p>
              </div>
            )}

            {currentProject.currentMasterPlot && (
              <div className={cardClass}>
                <h3 className="text-base font-semibold text-(--color-text-primary) mb-3">
                  当前主情节
                </h3>
                <div className="grid gap-2 mb-4">
                  <div>
                    <p className={metaLabelClass}>标题</p>
                    <p className={metaValueClass}>
                      {currentProject.currentMasterPlot.title ?? "未命名"}
                    </p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>一句话梗概</p>
                    <p className={metaValueClass}>{currentProject.currentMasterPlot.logline}</p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>主要角色</p>
                    <p className={metaValueClass}>
                      {currentProject.currentMasterPlot.mainCharacters.join("，")}
                    </p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>更新时间</p>
                    <p className={metaValueClass}>
                      {new Date(currentProject.currentMasterPlot.updatedAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                </div>

                {currentProject.status === "master_plot_in_review" && (
                  <Link
                    to={`/projects/${currentProject.id}/review`}
                    className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) hover:opacity-90 transition-opacity no-underline"
                  >
                    进入审核 →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </AsyncState>
    </div>
  );
}
