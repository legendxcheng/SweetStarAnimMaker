import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ProjectDetail, TaskDetail } from "@sweet-star/shared";
import { AsyncState } from "../components/async-state";
import { ErrorState } from "../components/error-state";
import { MasterPlotPhasePanel } from "../components/master-plot-phase-panel";
import { PageHeader } from "../components/page-header";
import { PremisePhasePanel } from "../components/premise-phase-panel";
import { ProjectPhaseNav } from "../components/project-phase-nav";
import { useTaskPolling } from "../hooks/use-task-polling";
import { apiClient } from "../services/api-client";

function isActiveTask(task: TaskDetail | null) {
  return task?.status === "pending" || task?.status === "running";
}

const PROJECT_PHASES = [
  { key: "premise", label: "前提", enabled: true },
  { key: "master_plot", label: "主情节", enabled: true },
  { key: "storyboard", label: "分镜", enabled: false },
  { key: "shot_script", label: "镜头脚本", enabled: false },
  { key: "image", label: "出图", enabled: false },
  { key: "final_cut", label: "成片", enabled: false },
] as const;

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTask, setActiveTask] = useState<TaskDetail | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<(typeof PROJECT_PHASES)[number]["key"]>(
    "premise",
  );

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

            <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <ProjectPhaseNav
                phases={PROJECT_PHASES}
                selectedPhase={selectedPhase}
                onSelect={setSelectedPhase}
              />

              <div>
                {selectedPhase === "premise" ? (
                  <PremisePhasePanel project={currentProject} />
                ) : (
                  <MasterPlotPhasePanel
                    project={currentProject}
                    task={task}
                    taskError={taskError}
                    creatingTask={creatingTask}
                    disableGenerate={creatingTask || isActiveTask(task)}
                    onGenerate={() => {
                      void handleGenerateMasterPlot();
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </AsyncState>
    </div>
  );
}
