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
    if (!projectId) {
      return;
    }

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
    if (project?.status !== "storyboard_generating" || activeTask) {
      return;
    }

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

  const handleGenerateStoryboard = async () => {
    if (!projectId || creatingTask || isActiveTask(task)) {
      return;
    }

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
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "white",
                    color: "#333",
                    textDecoration: "none",
                    border: "1px solid #e0e0e0",
                    borderRadius: "0.25rem",
                  }}
                >
                  Back to Projects
                </Link>
              }
            />

            <div
              style={{
                padding: "1.5rem",
                border: "1px solid #e0e0e0",
                borderRadius: "0.5rem",
                backgroundColor: "white",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ marginBottom: "1rem" }}>
                <StatusBadge status={currentProject.status} />
              </div>

              <div style={{ display: "grid", gap: "0.5rem" }}>
                <div>
                  <strong>Project ID:</strong> {currentProject.id}
                </div>
                <div>
                  <strong>Slug:</strong> {currentProject.slug}
                </div>
                <div>
                  <strong>Script:</strong> {currentProject.script.path} (
                  {currentProject.script.bytes} bytes)
                </div>
                <div>
                  <strong>Created:</strong>{" "}
                  {new Date(currentProject.createdAt).toLocaleString()}
                </div>
                <div>
                  <strong>Updated:</strong>{" "}
                  {new Date(currentProject.updatedAt).toLocaleString()}
                </div>
              </div>

              <div style={{ marginTop: "1.5rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    void handleGenerateStoryboard();
                  }}
                  disabled={creatingTask || isActiveTask(task)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor:
                      creatingTask || isActiveTask(task) ? "#b0bec5" : "#2196F3",
                    color: "white",
                    border: "none",
                    borderRadius: "0.25rem",
                    cursor:
                      creatingTask || isActiveTask(task) ? "not-allowed" : "pointer",
                  }}
                >
                  {creatingTask ? "Starting..." : "Generate Storyboard"}
                </button>
              </div>
            </div>

            {task && (
              <div
                style={{
                  padding: "1.5rem",
                  border: "1px solid #e0e0e0",
                  borderRadius: "0.5rem",
                  backgroundColor: "white",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                  }}
                >
                  Task Status
                </h3>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <div>
                    <strong>Task ID:</strong> {task.id}
                  </div>
                  <div>
                    <strong>Status:</strong> {task.status}
                  </div>
                  <div>
                    <strong>Updated:</strong>{" "}
                    {new Date(task.updatedAt).toLocaleString()}
                  </div>
                  {task.errorMessage && (
                    <div style={{ color: "#c62828" }}>{task.errorMessage}</div>
                  )}
                </div>
              </div>
            )}

            {taskError && task && (
              <div style={{ marginBottom: "1.5rem" }}>
                <ErrorState error={taskError} />
              </div>
            )}

            {currentProject.status === "storyboard_generating" && !task && (
              <div
                style={{
                  padding: "1.5rem",
                  border: "1px solid #FF9800",
                  borderRadius: "0.5rem",
                  backgroundColor: "#FFF3E0",
                  color: "#E65100",
                  marginBottom: "1.5rem",
                }}
              >
                <p>Storyboard generation in progress... auto-refreshing project status.</p>
              </div>
            )}

            {currentProject.currentStoryboard && (
              <div
                style={{
                  padding: "1.5rem",
                  border: "1px solid #e0e0e0",
                  borderRadius: "0.5rem",
                  backgroundColor: "white",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                  }}
                >
                  Current Storyboard
                </h3>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <div>
                    <strong>Version:</strong> v
                    {currentProject.currentStoryboard.versionNumber}
                  </div>
                  <div>
                    <strong>Type:</strong> {currentProject.currentStoryboard.kind}
                  </div>
                  <div>
                    <strong>Provider:</strong>{" "}
                    {currentProject.currentStoryboard.provider}
                  </div>
                  <div>
                    <strong>Model:</strong> {currentProject.currentStoryboard.model}
                  </div>
                  <div>
                    <strong>Created:</strong>{" "}
                    {new Date(
                      currentProject.currentStoryboard.createdAt,
                    ).toLocaleString()}
                  </div>
                </div>

                {currentProject.status === "storyboard_in_review" && (
                  <div style={{ marginTop: "1rem" }}>
                    <Link
                      to={`/projects/${currentProject.id}/review`}
                      style={{
                        padding: "0.75rem 1.5rem",
                        backgroundColor: "#2196F3",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: "0.25rem",
                        display: "inline-block",
                      }}
                    >
                      Enter Review
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </AsyncState>
    </div>
  );
}
