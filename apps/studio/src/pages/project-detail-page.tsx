import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ProjectDetail, TaskDetail } from "@sweet-star/shared";
import { AsyncState } from "../components/async-state";
import { CharacterSheetsPhasePanel } from "../components/character-sheets-phase-panel";
import { ErrorState } from "../components/error-state";
import { ImagePhasePanel } from "../components/image-phase-panel";
import { MasterPlotPhasePanel } from "../components/master-plot-phase-panel";
import { PageHeader } from "../components/page-header";
import { PremisePhasePanel } from "../components/premise-phase-panel";
import { ProjectPhaseNav } from "../components/project-phase-nav";
import { ShotScriptPhasePanel } from "../components/shot-script-phase-panel";
import { StoryboardPhasePanel } from "../components/storyboard-phase-panel";
import { useTaskPolling } from "../hooks/use-task-polling";
import { apiClient } from "../services/api-client";

function isActiveTask(task: TaskDetail | null) {
  return task?.status === "pending" || task?.status === "running";
}

const PROJECT_PHASES = [
  { key: "premise", label: "前提" },
  { key: "master_plot", label: "主情节" },
  { key: "character_sheets", label: "角色设定" },
  { key: "storyboard", label: "分镜" },
  { key: "shot_script", label: "镜头脚本" },
  { key: "images", label: "画面" },
  { key: "final_cut", label: "成片" },
] as const;

function isCharacterSheetsPhaseEnabled(project: ProjectDetail | null) {
  if (!project) {
    return false;
  }

  return (
    project.status === "master_plot_approved" ||
    project.status === "character_sheets_generating" ||
    project.status === "character_sheets_in_review" ||
    project.status === "character_sheets_approved" ||
    project.currentCharacterSheetBatch !== null
  );
}

function isStoryboardPhaseEnabled(project: ProjectDetail | null) {
  if (!project) {
    return false;
  }

  return (
    project.status === "character_sheets_approved" ||
    project.status === "storyboard_generating" ||
    project.status === "storyboard_in_review" ||
    project.status === "storyboard_approved" ||
    project.currentStoryboard !== null
  );
}

function isShotScriptPhaseEnabled(project: ProjectDetail | null) {
  if (!project) {
    return false;
  }

  return (
    project.status === "storyboard_approved" ||
    project.status === "shot_script_generating" ||
    project.status === "shot_script_in_review" ||
    project.status === "shot_script_approved" ||
    project.currentShotScript !== null
  );
}

function canGenerateShotScript(project: ProjectDetail | null) {
  if (!project) {
    return false;
  }

  return (
    project.status === "storyboard_approved" ||
    project.status === "shot_script_in_review" ||
    project.status === "shot_script_approved"
  );
}

function isImagesPhaseEnabled(project: ProjectDetail | null) {
  if (!project) {
    return false;
  }

  return (
    project.currentShotScript?.approvedAt !== null ||
    project.status === "shot_script_approved" ||
    project.status === "images_generating" ||
    project.status === "images_in_review" ||
    project.status === "images_approved" ||
    project.currentImageBatch !== null
  );
}

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

  const loadProject = async (options?: { showLoading?: boolean }) => {
    if (!projectId) return;
    const shouldShowLoading = options?.showLoading ?? project === null;

    try {
      if (shouldShowLoading) {
        setLoading(true);
      }
      setError(null);
      const response = await apiClient.getProjectDetail(projectId);
      setProject(response);
    } catch (err) {
      setError(err as Error);
    } finally {
      if (shouldShowLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadProject({ showLoading: true });
  }, [projectId]);

  useEffect(() => {
    if (
      !project ||
      activeTask ||
      (project.status !== "master_plot_generating" &&
        project.status !== "character_sheets_generating" &&
        project.status !== "storyboard_generating" &&
        project.status !== "shot_script_generating" &&
        project.status !== "images_generating")
    ) {
      return;
    }

    const interval = setInterval(() => {
      void loadProject({ showLoading: false });
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
      await loadProject({ showLoading: false });
    },
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

  const handleGenerateCharacterSheets = async () => {
    if (!projectId || creatingTask || isActiveTask(task)) return;
    try {
      setCreatingTask(true);
      const nextTask = await apiClient.createCharacterSheetsGenerateTask(projectId);
      setActiveTask(nextTask);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleGenerateShotScript = async () => {
    if (!projectId || creatingTask || isActiveTask(task)) return;
    try {
      setCreatingTask(true);
      const nextTask = await apiClient.createShotScriptGenerateTask(projectId);
      setActiveTask(nextTask);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!projectId || creatingTask || isActiveTask(task)) return;
    try {
      setCreatingTask(true);
      const nextTask = await apiClient.createImagesGenerateTask(projectId);
      setActiveTask(nextTask);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setCreatingTask(false);
    }
  };

  const phaseItems = PROJECT_PHASES.map((phase) => ({
    ...phase,
    enabled:
      phase.key === "premise" ||
      phase.key === "master_plot" ||
      (phase.key === "character_sheets" && isCharacterSheetsPhaseEnabled(project)) ||
      (phase.key === "storyboard" && isStoryboardPhaseEnabled(project)) ||
      (phase.key === "shot_script" && isShotScriptPhaseEnabled(project)) ||
      (phase.key === "images" && isImagesPhaseEnabled(project)),
  }));

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
                phases={phaseItems}
                selectedPhase={selectedPhase}
                onSelect={setSelectedPhase}
              />

              <div>
                {selectedPhase === "premise" ? (
                  <PremisePhasePanel project={currentProject} />
                ) : selectedPhase === "master_plot" ? (
                  <MasterPlotPhasePanel
                    project={currentProject}
                    task={task}
                    taskError={taskError}
                    creatingTask={creatingTask}
                    disableGenerate={
                      creatingTask ||
                      isActiveTask(task) ||
                      currentProject.status !== "premise_ready"
                    }
                    onGenerate={() => {
                      void handleGenerateMasterPlot();
                    }}
                  />
                ) : selectedPhase === "character_sheets" ? (
                  <CharacterSheetsPhasePanel
                    project={currentProject}
                    task={task}
                    taskError={taskError}
                    creatingTask={creatingTask}
                    disableGenerate={
                      creatingTask ||
                      isActiveTask(task) ||
                      currentProject.status !== "master_plot_approved"
                    }
                    onGenerate={() => {
                      void handleGenerateCharacterSheets();
                    }}
                    onProjectRefresh={loadProject}
                  />
                ) : selectedPhase === "storyboard" ? (
                  <StoryboardPhasePanel
                    project={currentProject}
                    task={task}
                    taskError={taskError}
                    creatingTask={creatingTask}
                    disableGenerate={
                      creatingTask ||
                      isActiveTask(task) ||
                      currentProject.status !== "character_sheets_approved"
                    }
                    onGenerate={() => {
                      void handleGenerateStoryboard();
                    }}
                  />
                ) : selectedPhase === "shot_script" ? (
                  <ShotScriptPhasePanel
                    project={currentProject}
                    task={task}
                    taskError={taskError}
                    creatingTask={creatingTask}
                    disableGenerate={
                      creatingTask ||
                      isActiveTask(task) ||
                      !canGenerateShotScript(currentProject)
                    }
                    onGenerate={() => {
                      void handleGenerateShotScript();
                    }}
                  />
                ) : (
                  <ImagePhasePanel
                    project={currentProject}
                    task={task}
                    taskError={taskError}
                    creatingTask={creatingTask}
                    disableGenerate={
                      creatingTask ||
                      isActiveTask(task) ||
                      currentProject.status !== "shot_script_approved"
                    }
                    onGenerate={() => {
                      void handleGenerateImages();
                    }}
                    onProjectRefresh={loadProject}
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
