import { useEffect, useState } from "react";
import type {
  FinalCutRecord,
  ProjectDetail,
  ShotVideoRecord,
  TaskDetail,
  VideoListResponse,
} from "@sweet-star/shared";

import { apiClient } from "../services/api-client";
import { getButtonClassName } from "../styles/button-styles";
import { ErrorState } from "./error-state";
import { CARD_CLASS, META_LABEL_CLASS, META_VALUE_CLASS } from "./video-phase-panel/constants";
import { FinalCutCard } from "./video-phase-panel/final-cut-card";
import { TaskStatusCard } from "./video-phase-panel/task-status-card";
import type { VideoPhaseActionBusy } from "./video-phase-panel/types";
import { sortShotsByHierarchy } from "./video-phase-panel/utils";
import { VideoShotCard } from "./video-phase-panel/video-shot-card";

interface VideoPhasePanelProps {
  project: ProjectDetail;
  task: TaskDetail | null;
  taskError: Error | null;
  creatingTask: boolean;
  disableGenerate: boolean;
  onGenerate: () => void;
  onProjectRefresh?: () => void | Promise<void>;
}

export function VideoPhasePanel({
  project,
  task,
  taskError,
  creatingTask,
  disableGenerate,
  onGenerate,
  onProjectRefresh,
}: VideoPhasePanelProps) {
  const [shots, setShots] = useState<ShotVideoRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<Error | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [actionBusy, setActionBusy] = useState<VideoPhaseActionBusy>(null);
  const [finalCut, setFinalCut] = useState<FinalCutRecord | null>(null);
  const [finalCutLoading, setFinalCutLoading] = useState(false);
  const [finalCutError, setFinalCutError] = useState<Error | null>(null);
  const [finalCutTask, setFinalCutTask] = useState<TaskDetail | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const batchSummary = project.currentVideoBatch;
  const allShotsApproved =
    batchSummary !== null &&
    batchSummary.shotCount > 0 &&
    batchSummary.approvedShotCount === batchSummary.shotCount;

  useEffect(() => {
    if (!batchSummary) {
      setShots([]);
      setDrafts({});
      setListError(null);
      setListLoading(false);
      setFinalCut(null);
      setFinalCutError(null);
      setFinalCutLoading(false);
      setFinalCutTask(null);
      return;
    }

    let cancelled = false;

    async function loadShots() {
      setListLoading(true);

      try {
        const response = await apiClient.listVideos(project.id);

        if (cancelled) {
          return;
        }

        applyVideoListResponse(response);
        setListError(null);
      } catch (error) {
        if (!cancelled) {
          setListError(error as Error);
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    }

    void loadShots();

    return () => {
      cancelled = true;
    };
  }, [batchSummary?.id, project.id, project.updatedAt]);

  useEffect(() => {
    if (!batchSummary) {
      return;
    }

    let cancelled = false;

    async function loadFinalCut() {
      setFinalCutLoading(true);

      try {
        const response = await apiClient.getFinalCut(project.id);

        if (cancelled) {
          return;
        }

        setFinalCut(response.currentFinalCut);
        setFinalCutError(null);
      } catch (error) {
        if (!cancelled) {
          setFinalCutError(error as Error);
        }
      } finally {
        if (!cancelled) {
          setFinalCutLoading(false);
        }
      }
    }

    void loadFinalCut();

    return () => {
      cancelled = true;
    };
  }, [
    batchSummary?.id,
    batchSummary?.approvedShotCount,
    batchSummary?.updatedAt,
    project.id,
  ]);

  useEffect(() => {
    if (!batchSummary || project.status !== "videos_generating") {
      return;
    }

    let cancelled = false;
    const intervalId = setInterval(() => {
      void (async () => {
        try {
          const response = await apiClient.listVideos(project.id);

          if (cancelled) {
            return;
          }

          applyVideoListResponse(response);
          setListError(null);
        } catch (error) {
          if (!cancelled) {
            setListError(error as Error);
          }
        }
      })();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [batchSummary?.id, project.id, project.status]);

  useEffect(() => {
    if (!finalCutTask || finalCutTask.status === "succeeded" || finalCutTask.status === "failed") {
      return;
    }

    let cancelled = false;
    const intervalId = setInterval(() => {
      void (async () => {
        try {
          const nextTask = await apiClient.getTaskDetail(finalCutTask.id);

          if (cancelled) {
            return;
          }

          setFinalCutTask(nextTask);

          if (nextTask.status === "succeeded") {
            const response = await apiClient.getFinalCut(project.id);

            if (cancelled) {
              return;
            }

            setFinalCut(response.currentFinalCut);
            setFinalCutError(null);
            await onProjectRefresh?.();
          }
        } catch (error) {
          if (!cancelled) {
            setFinalCutError(error as Error);
          }
        }
      })();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [finalCutTask, onProjectRefresh, project.id]);

  function applyVideoListResponse(response: VideoListResponse) {
    setShots(sortShotsByHierarchy(response.shots));
    setDrafts((currentDrafts) => {
      const nextDrafts: Record<string, string> = {};
      const previousShotsById = new Map(shots.map((shot) => [shot.id, shot]));

      for (const shot of response.shots) {
        const currentDraft = currentDrafts[shot.id];
        const previousShot = previousShotsById.get(shot.id);
        const shouldSyncWithServer =
          currentDraft === undefined ||
          !previousShot ||
          currentDraft === previousShot.promptTextCurrent;

        nextDrafts[shot.id] = shouldSyncWithServer
          ? shot.promptTextCurrent
          : currentDraft;
      }

      return nextDrafts;
    });
  }

  function updateShot(nextShot: ShotVideoRecord) {
    setShots((currentShots) =>
      sortShotsByHierarchy(
        currentShots.map((shot) => (shot.id === nextShot.id ? nextShot : shot)),
      ),
    );
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [nextShot.id]: nextShot.promptTextCurrent,
    }));
  }

  async function refreshProject() {
    await onProjectRefresh?.();
  }

  async function refreshVideos() {
    const response = await apiClient.listVideos(project.id);
    applyVideoListResponse(response);
    setListError(null);
  }

  async function refreshFinalCut() {
    const response = await apiClient.getFinalCut(project.id);
    setFinalCut(response.currentFinalCut);
    setFinalCutError(null);
  }

  async function handleRegenerate(shotId: string) {
    try {
      setActionBusy({ kind: "regenerate", shotId });
      await apiClient.regenerateVideoSegment(project.id, shotId);
      await refreshProject();
      await refreshVideos();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleSavePrompt(shot: ShotVideoRecord) {
    const promptTextCurrent = drafts[shot.id]?.trim() ?? "";

    if (!promptTextCurrent) {
      return;
    }

    try {
      setActionBusy({ kind: "save-prompt", shotId: shot.id });
      const updatedShot = await apiClient.updateVideoPrompt(project.id, shot.id, {
        promptTextCurrent,
      });

      updateShot(updatedShot);
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleRegeneratePrompt(shot: ShotVideoRecord) {
    try {
      setActionBusy({ kind: "regenerate-prompt", shotId: shot.id });
      const updatedShot = await apiClient.regenerateVideoPrompt(project.id, shot.id);

      updateShot(updatedShot);
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleApprove(shotId: string) {
    try {
      setActionBusy({ kind: "approve", shotId });
      await apiClient.approveVideoSegment(project.id, shotId);
      await refreshProject();
      await refreshVideos();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleApproveAll() {
    try {
      setActionBusy({ kind: "approve-all" });
      await apiClient.approveAllVideoSegments(project.id);
      await refreshProject();
      await refreshVideos();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleRegenerateAllPrompts() {
    if (!batchSummary) {
      return;
    }

    try {
      setActionBusy({ kind: "regenerate-all-prompts" });
      const response = await apiClient.regenerateAllVideoPrompts(project.id);

      applyVideoListResponse(response);
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleRegenerateAllVideos() {
    if (!batchSummary || shots.length === 0) {
      return;
    }

    try {
      setActionBusy({ kind: "regenerate-all-videos" });

      for (const shot of shots) {
        await apiClient.regenerateVideoSegment(project.id, shot.id);
      }

      await refreshProject();
      await refreshVideos();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleGenerateFinalCut() {
    if (!allShotsApproved) {
      return;
    }

    try {
      setFinalCutTask(await apiClient.createFinalCutGenerateTask(project.id));
      setFinalCutError(null);
      await refreshFinalCut();
    } catch (error) {
      setFinalCutError(error as Error);
    }
  }

  const canApproveAll =
    shots.length > 0 &&
    shots.every((shot) => shot.status === "in_review" || shot.status === "approved");
  const hasDirtyPrompts = shots.some(
    (shot) => (drafts[shot.id] ?? shot.promptTextCurrent) !== shot.promptTextCurrent,
  );

  return (
    <section aria-label="视频工作区">
      <div className={CARD_CLASS}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-(--color-text-primary)">视频工作区</h3>
            <p className="text-sm text-(--color-text-muted) mt-1">
              每个 Shot 维护一个当前视频片段，支持逐镜头重生成、审核和整批收口。
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            {batchSummary && (
              <button
                type="button"
                onClick={() => {
                  void handleRegenerateAllPrompts();
                }}
                disabled={actionBusy !== null}
                className={getButtonClassName({ variant: "warning" })}
              >
                重新生成所有镜头提示词
              </button>
            )}
            {batchSummary && shots.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  void handleRegenerateAllVideos();
                }}
                disabled={actionBusy !== null || hasDirtyPrompts || shots.length === 0}
                className={getButtonClassName({ variant: "warning" })}
              >
                重新生成所有镜头视频
              </button>
            )}
            {batchSummary && (
              <button
                type="button"
                onClick={() => {
                  void handleApproveAll();
                }}
                disabled={actionBusy !== null || !canApproveAll}
                className={getButtonClassName({ variant: "success" })}
              >
                全部视频审核通过
              </button>
            )}
            {!batchSummary && (
              <button
                type="button"
                onClick={onGenerate}
                disabled={disableGenerate}
                className={getButtonClassName()}
              >
                {creatingTask ? "启动中..." : "开始生成视频提示词"}
              </button>
            )}
          </div>
        </div>

        {batchSummary ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className={META_LABEL_CLASS}>Shot 数量</p>
              <p className={META_VALUE_CLASS}>{batchSummary.shotCount}</p>
            </div>
            <div>
              <p className={META_LABEL_CLASS}>已通过镜头</p>
              <p className={META_VALUE_CLASS}>
                {batchSummary.approvedShotCount}/{batchSummary.shotCount}
              </p>
            </div>
            <div>
              <p className={META_LABEL_CLASS}>更新时间</p>
              <p className={META_VALUE_CLASS}>
                {new Date(batchSummary.updatedAt).toLocaleString("zh-CN")}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-(--color-text-muted)">
            当前阶段会先为每个 Shot 生成可编辑视频提示词，确认后再逐镜头或整批生成视频。
          </p>
        )}
      </div>

      {batchSummary && (
        <FinalCutCard
          allShotsApproved={allShotsApproved}
          batchSummary={batchSummary}
          cardClass={CARD_CLASS}
          finalCut={finalCut}
          finalCutLoading={finalCutLoading}
          finalCutTask={finalCutTask}
          onGenerateFinalCut={() => {
            void handleGenerateFinalCut();
          }}
          projectId={project.id}
        />
      )}

      {task && (
        <TaskStatusCard
          cardClass={CARD_CLASS}
          metaLabelClass={META_LABEL_CLASS}
          metaValueClass={META_VALUE_CLASS}
          task={task}
        />
      )}

      {taskError && task && (
        <div className="mb-4">
          <ErrorState error={taskError} />
        </div>
      )}

      {project.status === "videos_generating" && !task && (
        <div className="bg-(--color-warning)/10 border border-(--color-warning)/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-(--color-warning)">视频生成任务执行中，正在自动刷新项目状态。</p>
        </div>
      )}

      {listError && (
        <div className="mb-4">
          <ErrorState error={listError} />
        </div>
      )}

      {actionError && (
        <div className="mb-4">
          <ErrorState error={actionError} />
        </div>
      )}

      {finalCutError && (
        <div className="mb-4">
          <ErrorState error={finalCutError} />
        </div>
      )}

      {batchSummary && listLoading && (
        <div className={CARD_CLASS}>
          <p className="text-sm text-(--color-text-muted)">正在加载当前视频批次...</p>
        </div>
      )}

      {batchSummary && !listLoading && shots.length === 0 && !listError && (
        <div className={CARD_CLASS}>
          <p className="text-sm text-(--color-text-muted)">当前批次还没有可审核的视频镜头。</p>
        </div>
      )}

      {shots.map((shot) => {
        const promptDraft = drafts[shot.id] ?? shot.promptTextCurrent;
        const isDirty = promptDraft !== shot.promptTextCurrent;
        const isBusy =
          actionBusy?.kind === "approve-all" ||
          actionBusy?.kind === "regenerate-all-prompts" ||
          actionBusy?.kind === "regenerate-all-videos" ||
          actionBusy?.shotId === shot.id;

        return (
          <VideoShotCard
            key={shot.id}
            cardClass={CARD_CLASS}
            isBusy={isBusy}
            isDirty={isDirty}
            metaLabelClass={META_LABEL_CLASS}
            metaValueClass={META_VALUE_CLASS}
            onApprove={() => {
              void handleApprove(shot.id);
            }}
            onDraftChange={(value) => {
              setDrafts((currentDrafts) => ({
                ...currentDrafts,
                [shot.id]: value,
              }));
            }}
            onRegenerate={() => {
              void handleRegenerate(shot.id);
            }}
            onRegeneratePrompt={() => {
              void handleRegeneratePrompt(shot);
            }}
            onSavePrompt={() => {
              void handleSavePrompt(shot);
            }}
            projectId={project.id}
            promptDraft={promptDraft}
            shot={shot}
          />
        );
      })}
    </section>
  );
}
