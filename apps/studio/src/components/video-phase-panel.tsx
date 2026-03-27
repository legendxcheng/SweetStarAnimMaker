import { useEffect, useState } from "react";
import type {
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
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";
  const batchSummary = project.currentVideoBatch;

  useEffect(() => {
    if (!batchSummary) {
      setShots([]);
      setDrafts({});
      setListError(null);
      setListLoading(false);
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

  function applyVideoListResponse(response: VideoListResponse) {
    setShots(response.shots);
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
      currentShots.map((shot) => (shot.id === nextShot.id ? nextShot : shot)),
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

  const canApproveAll =
    shots.length > 0 &&
    shots.every((shot) => shot.status === "in_review" || shot.status === "approved");
  const hasDirtyPrompts = shots.some(
    (shot) => (drafts[shot.id] ?? shot.promptTextCurrent) !== shot.promptTextCurrent,
  );

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
        const isBusy =
          actionBusy?.kind === "approve-all" ||
          actionBusy?.kind === "regenerate-all-prompts" ||
          actionBusy?.kind === "regenerate-all-videos" ||
          actionBusy?.shotId === shot.id;

        return (
          <article key={shot.id} className={cardClass}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h4 className="text-base font-semibold text-(--color-text-primary)">
                  {shot.shotCode}
                </h4>
                <p className="text-sm text-(--color-text-muted) mt-1">{shot.sceneId}</p>
              </div>
              <div className="text-right">
                <p className={metaLabelClass}>当前状态</p>
                <p className={metaValueClass}>{VIDEO_STATUS_LABELS[shot.status]}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
              <div>
                {shot.videoAssetPath ? (
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
