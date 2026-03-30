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
import { VideoPhasePanel } from "../components/video-phase-panel";
import { useTaskPolling } from "../hooks/use-task-polling";
import { apiClient } from "../services/api-client";
import { getButtonClassName } from "../styles/button-styles";

function isActiveTask(task: TaskDetail | null) {
  return task?.status === "pending" || task?.status === "running";
}

function isGeneratingProject(project: ProjectDetail | null) {
  return project?.status.endsWith("_generating") ?? false;
}

const PROJECT_PHASES = [
  { key: "premise", label: "前提" },
  { key: "master_plot", label: "主情节" },
  { key: "character_sheets", label: "角色设定" },
  { key: "storyboard", label: "分镜" },
  { key: "shot_script", label: "镜头脚本" },
  { key: "images", label: "画面" },
  { key: "videos", label: "视频" },
  { key: "final_cut", label: "成片" },
] as const;

type ProjectPhaseKey = (typeof PROJECT_PHASES)[number]["key"];

function getDefaultProjectPhase(project: ProjectDetail | null): ProjectPhaseKey {
  if (!project) {
    return "premise";
  }

  if (
    project.status === "videos_generating" ||
    project.status === "videos_in_review" ||
    project.status === "videos_approved" ||
    project.currentVideoBatch != null
  ) {
    return "videos";
  }

  if (
    project.status === "images_generating" ||
    project.status === "images_in_review" ||
    project.status === "images_approved" ||
    project.currentImageBatch != null
  ) {
    return "images";
  }

  if (
    project.status === "shot_script_generating" ||
    project.status === "shot_script_in_review" ||
    project.status === "shot_script_approved" ||
    project.currentShotScript != null
  ) {
    return "shot_script";
  }

  if (
    project.status === "storyboard_generating" ||
    project.status === "storyboard_in_review" ||
    project.status === "storyboard_approved" ||
    project.currentStoryboard != null
  ) {
    return "storyboard";
  }

  if (
    project.status === "character_sheets_generating" ||
    project.status === "character_sheets_in_review" ||
    project.status === "character_sheets_approved" ||
    project.currentCharacterSheetBatch != null
  ) {
    return "character_sheets";
  }

  if (
    project.status === "master_plot_generating" ||
    project.status === "master_plot_in_review" ||
    project.status === "master_plot_approved" ||
    project.currentMasterPlot != null
  ) {
    return "master_plot";
  }

  return "premise";
}

function isCharacterSheetsPhaseEnabled(project: ProjectDetail | null) {
  if (!project) {
    return false;
  }

  return hasApprovedMasterPlot(project) || project.currentCharacterSheetBatch != null;
}

function hasApprovedMasterPlot(project: ProjectDetail | null) {
  return project?.currentMasterPlot?.approvedAt != null;
}

function hasApprovedCharacterSheets(project: ProjectDetail | null) {
  if (!project?.currentCharacterSheetBatch) {
    return false;
  }

  return (
    project.currentCharacterSheetBatch.characterCount > 0 &&
    project.currentCharacterSheetBatch.approvedCharacterCount ===
      project.currentCharacterSheetBatch.characterCount
  );
}

function hasApprovedStoryboard(project: ProjectDetail | null) {
  return project?.currentStoryboard?.approvedAt != null;
}

function hasApprovedShotScript(project: ProjectDetail | null) {
  return project?.currentShotScript?.approvedAt != null;
}

function isStoryboardPhaseEnabled(project: ProjectDetail | null) {
  if (!project) {
    return false;
  }

  return hasApprovedCharacterSheets(project) || project.currentStoryboard != null;
}

function isShotScriptPhaseEnabled(project: ProjectDetail | null) {
  if (!project) {
    return false;
  }

  return hasApprovedStoryboard(project) || project.currentShotScript != null;
}

function canRegenerateMasterPlot(project: ProjectDetail | null) {
  return project !== null;
}

function canRegenerateCharacterSheets(project: ProjectDetail | null) {
  return hasApprovedMasterPlot(project);
}

function canRegenerateStoryboard(project: ProjectDetail | null) {
  return hasApprovedCharacterSheets(project);
}

function canRegenerateShotScript(project: ProjectDetail | null) {
  return hasApprovedStoryboard(project);
}

function canRegenerateImages(project: ProjectDetail | null) {
  return hasApprovedShotScript(project);
}

function hasApprovedImages(project: ProjectDetail | null) {
  if (!project?.currentImageBatch) {
    return false;
  }

  return (
    project.currentImageBatch.shotCount > 0 &&
    project.currentImageBatch.approvedShotCount === project.currentImageBatch.shotCount
  );
}

function isImagesPhaseEnabled(project: ProjectDetail | null) {
  if (!project) {
    return false;
  }

  return canRegenerateImages(project) || project.currentImageBatch != null;
}

function canGenerateVideos(project: ProjectDetail | null) {
  return hasApprovedImages(project) && project?.currentVideoBatch == null;
}

function isVideosPhaseEnabled(project: ProjectDetail | null) {
  if (!project) {
    return false;
  }

  return hasApprovedImages(project) || project.currentVideoBatch != null;
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTask, setActiveTask] = useState<TaskDetail | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [resettingPremise, setResettingPremise] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<ProjectPhaseKey>("premise");
  const [hasAutoSelectedPhase, setHasAutoSelectedPhase] = useState(false);

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
      if (!hasAutoSelectedPhase) {
        setSelectedPhase(getDefaultProjectPhase(response));
        setHasAutoSelectedPhase(true);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      if (shouldShowLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setSelectedPhase("premise");
    setHasAutoSelectedPhase(false);
  }, [projectId]);

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
        project.status !== "images_generating" &&
        project.status !== "videos_generating")
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

  const confirmRegeneration = () => {
    if (!isGeneratingProject(project)) {
      return true;
    }

    return window.confirm("这会放弃当前生成中的结果，并重置到该环节重新生成。是否继续？");
  };

  const handleRegenerateStoryboard = async () => {
    if (!projectId || creatingTask || !confirmRegeneration()) return;
    try {
      setCreatingTask(true);
      const nextTask = await apiClient.regenerateStoryboard(projectId);
      setActiveTask(nextTask);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleRegenerateMasterPlot = async () => {
    if (!projectId || creatingTask || !confirmRegeneration()) return;
    try {
      setCreatingTask(true);
      const nextTask = await apiClient.regenerateMasterPlot(projectId);
      setActiveTask(nextTask);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleRegenerateCharacterSheets = async () => {
    if (!projectId || creatingTask || !confirmRegeneration()) return;
    try {
      setCreatingTask(true);
      const nextTask = await apiClient.regenerateCharacterSheets(projectId);
      setActiveTask(nextTask);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleRegenerateShotScript = async () => {
    if (!projectId || creatingTask || !confirmRegeneration()) return;
    try {
      setCreatingTask(true);
      const nextTask = await apiClient.regenerateShotScript(projectId);
      setActiveTask(nextTask);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleRegenerateImages = async () => {
    if (!projectId || creatingTask || !confirmRegeneration()) return;
    try {
      setCreatingTask(true);
      const nextTask = await apiClient.regenerateImages(projectId);
      setActiveTask(nextTask);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleGenerateVideos = async () => {
    if (!projectId || creatingTask || !canGenerateVideos(project)) return;
    try {
      setCreatingTask(true);
      const nextTask = await apiClient.createVideosGenerateTask(projectId);
      setActiveTask(nextTask);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleResetPremise = async (input: {
    premiseText: string;
    visualStyleText?: string;
    confirmReset: true;
  }) => {
    if (!projectId || resettingPremise) {
      return;
    }

    setResettingPremise(true);

    try {
      const nextProject = await apiClient.resetProjectPremise(projectId, input);
      setProject(nextProject);
      setSelectedPhase("premise");
      setHasAutoSelectedPhase(true);
      setActiveTask(null);
    } finally {
      setResettingPremise(false);
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
      (phase.key === "images" && isImagesPhaseEnabled(project)) ||
      (phase.key === "videos" && isVideosPhaseEnabled(project)) ||
      (phase.key === "final_cut" && project?.currentVideoBatch != null),
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
                  className={`no-underline ${getButtonClassName({ variant: "secondary" })}`}
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
                  <PremisePhasePanel
                    project={currentProject}
                    resetting={resettingPremise}
                    onReset={handleResetPremise}
                  />
                ) : selectedPhase === "master_plot" ? (
                  <MasterPlotPhasePanel
                    project={currentProject}
                    task={task}
                    taskError={taskError}
                    creatingTask={creatingTask}
                    disableGenerate={creatingTask || !canRegenerateMasterPlot(currentProject)}
                    onGenerate={() => {
                      void handleRegenerateMasterPlot();
                    }}
                  />
                ) : selectedPhase === "character_sheets" ? (
                  <CharacterSheetsPhasePanel
                    project={currentProject}
                    task={task}
                    taskError={taskError}
                    creatingTask={creatingTask}
                    disableGenerate={creatingTask || !canRegenerateCharacterSheets(currentProject)}
                    onGenerate={() => {
                      void handleRegenerateCharacterSheets();
                    }}
                    onProjectRefresh={loadProject}
                  />
                ) : selectedPhase === "storyboard" ? (
                  <StoryboardPhasePanel
                    project={currentProject}
                    task={task}
                    taskError={taskError}
                    creatingTask={creatingTask}
                    disableGenerate={creatingTask || !canRegenerateStoryboard(currentProject)}
                    onGenerate={() => {
                      void handleRegenerateStoryboard();
                    }}
                  />
                ) : selectedPhase === "shot_script" ? (
                  <ShotScriptPhasePanel
                    project={currentProject}
                    task={task}
                    taskError={taskError}
                    creatingTask={creatingTask}
                    disableGenerate={creatingTask || !canRegenerateShotScript(currentProject)}
                    onGenerate={() => {
                      void handleRegenerateShotScript();
                    }}
                    onProjectRefresh={loadProject}
                  />
                ) : selectedPhase === "images" ? (
                  <ImagePhasePanel
                    project={currentProject}
                    task={task}
                    taskError={taskError}
                    creatingTask={creatingTask}
                    disableGenerate={creatingTask || !canRegenerateImages(currentProject)}
                    onGenerate={() => {
                      void handleRegenerateImages();
                    }}
                    onProjectRefresh={loadProject}
                  />
                ) : selectedPhase === "videos" ? (
                  <VideoPhasePanel
                    project={currentProject}
                    task={task}
                    taskError={taskError}
                    creatingTask={creatingTask}
                    disableGenerate={creatingTask || !canGenerateVideos(currentProject)}
                    onGenerate={() => {
                      void handleGenerateVideos();
                    }}
                    onProjectRefresh={loadProject}
                  />
                ) : (
                  <section className="bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-(--color-text-primary)">成片工作区</h3>
                    <p className="text-sm text-(--color-text-muted) mt-2">
                      `final_cut` 仍是预留阶段，后续会在这里接入时间轴拼接、音频与最终导出。
                    </p>
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </AsyncState>
    </div>
  );
}


