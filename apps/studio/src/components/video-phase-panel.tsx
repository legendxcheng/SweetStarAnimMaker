import { useEffect, useState } from "react";
import type {
  FinalCutRecord,
  ProjectDetail,
  ShotVideoRecord,
  TaskDetail,
  VideoListResponse,
} from "@sweet-star/shared";

import { apiClient } from "../services/api-client";
import { config } from "../services/config";
import { getButtonClassName } from "../styles/button-styles";
import { ErrorState } from "./error-state";

const TASK_STATUS_LABELS: Record<TaskDetail["status"], string> = {
  pending: "排队中",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
};

const VIDEO_STATUS_LABELS: Record<ShotVideoRecord["status"], string> = {
  generating: "生成中",
  in_review: "待审核",
  approved: "已通过",
  failed: "失败",
};

const shotHierarchyCollator = new Intl.Collator("zh-CN", {
  numeric: true,
  sensitivity: "base",
});

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
  const [actionBusy, setActionBusy] = useState<
    | {
        kind:
          | "save-prompt"
          | "regenerate-prompt"
          | "regenerate-all-prompts"
          | "regenerate"
          | "regenerate-all-videos"
          | "approve"
          | "approve-all";
        shotId?: string;
      }
    | null
  >(null);
  const [finalCut, setFinalCut] = useState<FinalCutRecord | null>(null);
  const [finalCutLoading, setFinalCutLoading] = useState(false);
  const [finalCutError, setFinalCutError] = useState<Error | null>(null);
  const [finalCutTask, setFinalCutTask] = useState<TaskDetail | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";
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
  const finalCutVideoUrl =
    finalCut?.status === "ready" && finalCut.videoAssetPath
      ? getAssetUrl(project.id, finalCut.videoAssetPath, finalCut.updatedAt)
      : null;

  return (
    <section aria-label="视频工作区">
      <div className={cardClass}>
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
              <p className={metaLabelClass}>Shot 数量</p>
              <p className={metaValueClass}>{batchSummary.shotCount}</p>
            </div>
            <div>
              <p className={metaLabelClass}>已通过镜头</p>
              <p className={metaValueClass}>
                {batchSummary.approvedShotCount}/{batchSummary.shotCount}
              </p>
            </div>
            <div>
              <p className={metaLabelClass}>更新时间</p>
              <p className={metaValueClass}>
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
        <div className={cardClass}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-(--color-text-primary)">成片导出</h3>
              <p className="mt-1 text-sm text-(--color-text-muted)">
                按 scene、segment、shot 固定顺序拼接当前批次全部已通过镜头，生成项目级 MP4。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void handleGenerateFinalCut();
              }}
              disabled={!allShotsApproved || finalCutTask?.status === "pending" || finalCutTask?.status === "running"}
              className={getButtonClassName()}
            >
              {finalCutTask?.status === "pending" || finalCutTask?.status === "running"
                ? "生成中..."
                : "生成成片"}
            </button>
          </div>

          {!allShotsApproved && (
            <p className="mt-3 text-sm text-(--color-text-muted)">
              需先审核通过全部镜头片段后才能生成成片。
            </p>
          )}

          {finalCutTask && (
            <div className="mt-4 grid gap-2 rounded-xl border border-(--color-border) bg-(--color-bg-base) p-4">
              <div>
                <p className={metaLabelClass}>成片任务状态</p>
                <p className={metaValueClass}>{TASK_STATUS_LABELS[finalCutTask.status]}</p>
              </div>
              {finalCutTask.errorMessage && (
                <p className="text-sm text-(--color-danger)">{finalCutTask.errorMessage}</p>
              )}
            </div>
          )}

          {finalCutLoading && (
            <p className="mt-4 text-sm text-(--color-text-muted)">正在加载成片状态...</p>
          )}

          {finalCutVideoUrl && (
            <div className="mt-4 grid gap-4">
              <video
                data-testid="final-cut-player"
                controls
                preload="metadata"
                className="w-full rounded-xl border border-(--color-border) bg-black"
              >
                <source src={finalCutVideoUrl} type="video/mp4" />
              </video>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-(--color-bg-base) px-4 py-3">
                <div>
                  <p className={metaLabelClass}>当前成片</p>
                  <p className={metaValueClass}>
                    {finalCut?.shotCount ?? 0} 个镜头，更新于{" "}
                    {finalCut ? new Date(finalCut.updatedAt).toLocaleString("zh-CN") : "-"}
                  </p>
                </div>
                <a
                  href={finalCutVideoUrl}
                  download
                  className={getButtonClassName({ variant: "success" })}
                >
                  下载 MP4
                </a>
              </div>
            </div>
          )}
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
            {task.errorMessage && <p className="text-sm text-(--color-danger)">{task.errorMessage}</p>}
          </div>
        </div>
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
        <div className={cardClass}>
          <p className="text-sm text-(--color-text-muted)">正在加载当前视频批次...</p>
        </div>
      )}

      {batchSummary && !listLoading && shots.length === 0 && !listError && (
        <div className={cardClass}>
          <p className="text-sm text-(--color-text-muted)">当前批次还没有可审核的视频镜头。</p>
        </div>
      )}

      {shots.map((shot) => {
        const promptDraft = drafts[shot.id] ?? shot.promptTextCurrent;
        const isDirty = promptDraft !== shot.promptTextCurrent;
        const canSavePrompt = promptDraft.trim().length > 0;
        const isGenerating = shot.status === "generating";
        const isBusy =
          actionBusy?.kind === "approve-all" ||
          actionBusy?.kind === "regenerate-all-prompts" ||
          actionBusy?.kind === "regenerate-all-videos" ||
          actionBusy?.shotId === shot.id;

        return (
          <article
            key={shot.id}
            data-testid={`video-shot-card-${shot.id}`}
            data-generating-state={isGenerating ? "true" : "false"}
            className={`${cardClass} ${isGenerating ? "border-(--color-accent) ring-1 ring-(--color-accent)/50 shadow-md shadow-(--color-accent)/20 transition-all duration-300" : ""}`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h4 className="text-base font-semibold text-(--color-text-primary)">
                  {shot.shotCode}
                </h4>
                <p className="text-sm text-(--color-text-muted) mt-1">{shot.sceneId}</p>
              </div>
              <div className="text-right">
                <p className={metaLabelClass}>当前状态</p>
                <p className={`${metaValueClass} inline-flex items-center gap-2`}>
                  {isGenerating && (
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full bg-(--color-accent) animate-pulse"
                    />
                  )}
                  <span>{VIDEO_STATUS_LABELS[shot.status]}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
              <div>
                {isGenerating ? (
                  <div className="flex min-h-56 items-center justify-center rounded-xl border border-(--color-accent)/40 bg-(--color-accent)/8">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-3 h-8 w-8 rounded-full border-4 border-(--color-border-muted) border-t-(--color-accent) animate-spin" />
                      <p className="text-sm font-medium tracking-wide text-(--color-accent)">
                        视频生成中...
                      </p>
                    </div>
                  </div>
                ) : shot.videoAssetPath ? (
                  <video
                    controls
                    preload="metadata"
                    className="w-full rounded-xl border border-(--color-border) bg-black"
                    poster={
                      shot.thumbnailAssetPath
                        ? getAssetUrl(project.id, shot.thumbnailAssetPath, shot.updatedAt)
                        : undefined
                    }
                  >
                    <source
                      src={getAssetUrl(project.id, shot.videoAssetPath, shot.updatedAt)}
                      type="video/mp4"
                    />
                  </video>
                ) : (
                  <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-(--color-border-muted) bg-(--color-bg-base) text-sm text-(--color-text-muted)">
                    当前 Shot 还没有可播放视频
                  </div>
                )}
              </div>

              <div className="grid gap-3">
                <div>
                  <p className={metaLabelClass}>视频提示词</p>
                  <textarea
                    value={promptDraft}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDrafts((currentDrafts) => ({
                        ...currentDrafts,
                        [shot.id]: value,
                      }));
                    }}
                    rows={6}
                    className="w-full rounded-xl border border-(--color-border) bg-(--color-bg-base) px-3 py-2 text-sm text-(--color-text-primary) outline-none focus:border-(--color-primary)"
                  />
                </div>
                <div>
                  <p className={metaLabelClass}>Shot ID</p>
                  <p className={metaValueClass}>{shot.shotId}</p>
                </div>
                <div>
                  <p className={metaLabelClass}>镜头依赖</p>
                  <p className={metaValueClass}>
                    {shot.frameDependency === "start_frame_only"
                      ? "仅起始帧"
                      : "起始帧 + 结束帧"}
                  </p>
                </div>
                <div>
                  <p className={metaLabelClass}>模型</p>
                  <p className={metaValueClass}>{shot.model ?? "未生成"}</p>
                </div>
                <div>
                  <p className={metaLabelClass}>Provider</p>
                  <p className={metaValueClass}>{shot.provider ?? "未生成"}</p>
                </div>
                <div>
                  <p className={metaLabelClass}>时长</p>
                  <p className={metaValueClass}>
                    {shot.durationSec !== null ? `${shot.durationSec}s` : "未知"}
                  </p>
                </div>
                <div>
                  <p className={metaLabelClass}>更新时间</p>
                  <p className={metaValueClass}>
                    {new Date(shot.updatedAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  {isDirty && (
                    <button
                      type="button"
                      onClick={() => {
                        void handleSavePrompt(shot);
                      }}
                      disabled={isBusy || !canSavePrompt}
                      className={getButtonClassName()}
                    >
                      保存提示词
                    </button>
                  )}
                  {!isDirty && (
                    <button
                      type="button"
                      onClick={() => {
                        void handleRegeneratePrompt(shot);
                      }}
                      disabled={isBusy}
                      className={getButtonClassName({ variant: "warning" })}
                    >
                      重新生成当前镜头提示词
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      void handleRegenerate(shot.id);
                    }}
                    disabled={isBusy || isDirty}
                    className={getButtonClassName({ variant: "warning" })}
                  >
                    重新生成当前镜头视频
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleApprove(shot.id);
                    }}
                    disabled={isBusy || shot.status !== "in_review"}
                    className={getButtonClassName({ variant: "success" })}
                  >
                    审核通过当前镜头
                  </button>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function getAssetUrl(projectId: string, assetRelPath: string, updatedAt: string) {
  const url = new URL(config.projectAssetContentUrl(projectId, assetRelPath));
  url.searchParams.set("v", updatedAt);
  return url.toString();
}

function sortShotsByHierarchy(shots: ShotVideoRecord[]) {
  return [...shots].sort((left, right) => {
    const sceneCompare = shotHierarchyCollator.compare(left.sceneId, right.sceneId);
    if (sceneCompare !== 0) {
      return sceneCompare;
    }

    const segmentCompare = shotHierarchyCollator.compare(left.segmentId, right.segmentId);
    if (segmentCompare !== 0) {
      return segmentCompare;
    }

    const shotCompare = shotHierarchyCollator.compare(left.shotId, right.shotId);
    if (shotCompare !== 0) {
      return shotCompare;
    }

    return shotHierarchyCollator.compare(left.shotCode, right.shotCode);
  });
}
