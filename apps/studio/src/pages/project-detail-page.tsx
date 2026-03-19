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
    if (project?.status !== "storyboard_generating" || activeTask) return;
    const interval = setInterval(() => { void loadProject(); }, 3000);
    return () => { clearInterval(interval); };
  }, [project?.status, activeTask]);

  const polling = useTaskPolling({
    taskId: activeTask?.id ?? null,
    enabled: isActiveTask(activeTask),
    onTaskUpdate: setActiveTask,
    onTerminal: async () => { await loadProject(); },
  });

  const task = polling.task ?? activeTask;
  const taskError = polling.error ?? error;

  const handleGenerateStoryboard = async () => {
    if (!projectId || creatingTask || isActiveTask(task)) return;
    try {
      setCreatingTask(true);
      const nextTask = await apiClient.createStoryboardGenerateTask(projectId);
      setActiveTask(nextTask);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setCreatingTask(false);
    }
  };

  const cardClass = "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
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
                  ← Back to Projects
                </Link>
              }
            />

            {/* Project info card */}
            <div className={cardClass}>
              <div className="mb-4">
                <StatusBadge status={currentProject.status} />
              </div>
              <div className="grid gap-3">
                <div>
                  <p className={metaLabelClass}>Project ID</p>
                  <p className={`${metaValueClass} font-mono text-xs`}>{currentProject.id}</p>
                </div>
                <div>
                  <p className={metaLabelClass}>Slug</p>
                  <p className={metaValueClass}>{currentProject.slug}</p>
                </div>
                <div>
                  <p className={metaLabelClass}>Script</p>
                  <p className={metaValueClass}>
                    {currentProject.script.path}{" "}
                    <span className="text-(--color-text-muted)">
                      ({currentProject.script.bytes} bytes)
                    </span>
                  </p>
                </div>
                <div>
                  <p className={metaLabelClass}>Created</p>
                  <p className={metaValueClass}>
                    {new Date(currentProject.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className={metaLabelClass}>Updated</p>
                  <p className={metaValueClass}>
                    {new Date(currentProject.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => { void handleGenerateStoryboard(); }}
                  disabled={creatingTask || isActiveTask(task)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {creatingTask ? "Starting..." : "Generate Storyboard"}
                </button>
              </div>
            </div>

            {/* Task status card */}
            {task && (
              <div className={cardClass}>
                <h3 className="text-base font-semibold text-(--color-text-primary) mb-3">
                  Task Status
                </h3>
                <div className="grid gap-2">
                  <div>
                    <p className={metaLabelClass}>Task ID</p>
                    <p className={`${metaValueClass} font-mono text-xs`}>{task.id}</p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>Status</p>
                    <p className={metaValueClass}>{task.status}</p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>Updated</p>
                    <p className={metaValueClass}>
                      {new Date(task.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  {task.errorMessage && (
                    <p className="text-sm text-(--color-danger)">{task.errorMessage}</p>
                  )}
                </div>
              </div>
            )}

            {/* Task polling error */}
            {taskError && task && (
              <div className="mb-4">
                <ErrorState error={taskError} />
              </div>
            )}

            {/* In-progress notice (no active task object yet) */}
            {currentProject.status === "storyboard_generating" && !task && (
              <div className="bg-(--color-warning)/10 border border-(--color-warning)/30 rounded-xl p-4 mb-4">
                <p className="text-sm text-(--color-warning)">
                  Storyboard generation in progress... auto-refreshing project status.
                </p>
              </div>
            )}

            {/* Current storyboard card */}
            {currentProject.currentStoryboard && (
              <div className={cardClass}>
                <h3 className="text-base font-semibold text-(--color-text-primary) mb-3">
                  Current Storyboard
                </h3>
                <div className="grid gap-2 mb-4">
                  <div>
                    <p className={metaLabelClass}>Version</p>
                    <p className={metaValueClass}>
                      v{currentProject.currentStoryboard.versionNumber}
                    </p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>Type</p>
                    <p className={metaValueClass}>{currentProject.currentStoryboard.kind}</p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>Provider</p>
                    <p className={metaValueClass}>
                      {currentProject.currentStoryboard.provider}
                    </p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>Model</p>
                    <p className={metaValueClass}>{currentProject.currentStoryboard.model}</p>
                  </div>
                  <div>
                    <p className={metaLabelClass}>Created</p>
                    <p className={metaValueClass}>
                      {new Date(currentProject.currentStoryboard.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {currentProject.status === "storyboard_in_review" && (
                  <Link
                    to={`/projects/${currentProject.id}/review`}
                    className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) hover:opacity-90 transition-opacity no-underline"
                  >
                    Enter Review →
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
