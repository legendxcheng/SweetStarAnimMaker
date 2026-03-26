import { useEffect, useState } from "react";
import type {
  ProjectDetail,
  SegmentVideoRecord,
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

const VIDEO_STATUS_LABELS: Record<SegmentVideoRecord["status"], string> = {
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
  const [videos, setVideos] = useState<SegmentVideoRecord[]>([]);
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
        segmentId?: string;
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
      setVideos([]);
      setDrafts({});
      setListError(null);
      setListLoading(false);
      return;
    }

    let cancelled = false;

    async function loadVideos() {
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

    void loadVideos();

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
    setVideos(response.segments);
    setDrafts((currentDrafts) => {
      const nextDrafts: Record<string, string> = {};
      const previousVideosById = new Map(videos.map((video) => [video.id, video]));

      for (const segment of response.segments) {
        const currentDraft = currentDrafts[segment.id];
        const previousSegment = previousVideosById.get(segment.id);
        const shouldSyncWithServer =
          currentDraft === undefined ||
          !previousSegment ||
          currentDraft === previousSegment.promptTextCurrent;

        nextDrafts[segment.id] = shouldSyncWithServer
          ? segment.promptTextCurrent
          : currentDraft;
      }

      return nextDrafts;
    });
  }

  function updateVideo(nextVideo: SegmentVideoRecord) {
    setVideos((currentVideos) =>
      currentVideos.map((video) => (video.id === nextVideo.id ? nextVideo : video)),
    );
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [nextVideo.id]: nextVideo.promptTextCurrent,
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

  async function handleRegenerate(videoId: string) {
    try {
      setActionBusy({ kind: "regenerate", segmentId: videoId });
      await apiClient.regenerateVideoSegment(project.id, videoId);
      await refreshProject();
      await refreshVideos();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleSavePrompt(segment: SegmentVideoRecord) {
    const promptTextCurrent = drafts[segment.id]?.trim() ?? "";

    if (!promptTextCurrent) {
      return;
    }

    try {
      setActionBusy({ kind: "save-prompt", segmentId: segment.id });
      const updatedSegment = await apiClient.updateVideoPrompt(project.id, segment.id, {
        promptTextCurrent,
      });

      updateVideo(updatedSegment);
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleRegeneratePrompt(segment: SegmentVideoRecord) {
    try {
      setActionBusy({ kind: "regenerate-prompt", segmentId: segment.id });
      const updatedSegment = await apiClient.regenerateVideoPrompt(project.id, segment.id);

      updateVideo(updatedSegment);
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleApprove(videoId: string) {
    try {
      setActionBusy({ kind: "approve", segmentId: videoId });
      await apiClient.approveVideoSegment(project.id, videoId);
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
    if (!batchSummary || videos.length === 0) {
      return;
    }

    try {
      setActionBusy({ kind: "regenerate-all-videos" });

      for (const segment of videos) {
        await apiClient.regenerateVideoSegment(project.id, segment.id);
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
    videos.length > 0 &&
    videos.every((segment) => segment.status === "in_review" || segment.status === "approved");
  const hasDirtyPrompts = videos.some(
    (segment) => (drafts[segment.id] ?? segment.promptTextCurrent) !== segment.promptTextCurrent,
  );

  return (
    <section aria-label="视频工作区">
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-(--color-text-primary)">视频工作区</h3>
            <p className="text-sm text-(--color-text-muted) mt-1">
              每个 Segment 维护一个当前视频片段，支持逐段重生成、审核和整批收口。
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
                重新生成所有段落提示词
              </button>
            )}
            {batchSummary && videos.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  void handleRegenerateAllVideos();
                }}
                disabled={actionBusy !== null || hasDirtyPrompts || videos.length === 0}
                className={getButtonClassName({ variant: "warning" })}
              >
                重新生成所有视频段落
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
                {creatingTask ? "启动中..." : "开始生成视频"}
              </button>
            )}
          </div>
        </div>

        {batchSummary ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className={metaLabelClass}>Segment 数量</p>
              <p className={metaValueClass}>{batchSummary.segmentCount}</p>
            </div>
            <div>
              <p className={metaLabelClass}>已通过片段</p>
              <p className={metaValueClass}>
                {batchSummary.approvedSegmentCount}/{batchSummary.segmentCount}
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
            当前阶段会基于已审核起始帧和结束帧，为每个 Segment 生成一个可审核视频片段。
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

      {batchSummary && !listLoading && videos.length === 0 && !listError && (
        <div className={cardClass}>
          <p className="text-sm text-(--color-text-muted)">当前批次还没有可审核的视频片段。</p>
        </div>
      )}

      {videos.map((segment) => {
        const promptDraft = drafts[segment.id] ?? segment.promptTextCurrent;
        const isDirty = promptDraft !== segment.promptTextCurrent;
        const canSavePrompt = promptDraft.trim().length > 0;
        const isBusy =
          actionBusy?.kind === "approve-all" ||
          actionBusy?.kind === "regenerate-all-prompts" ||
          actionBusy?.kind === "regenerate-all-videos" ||
          actionBusy?.segmentId === segment.id;

        return (
          <article key={segment.id} className={cardClass}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h4 className="text-base font-semibold text-(--color-text-primary)">
                  Segment {segment.order}
                </h4>
                <p className="text-sm text-(--color-text-muted) mt-1">
                  {segment.sceneId} / {segment.segmentId}
                </p>
              </div>
              <div className="text-right">
                <p className={metaLabelClass}>当前状态</p>
                <p className={metaValueClass}>{VIDEO_STATUS_LABELS[segment.status]}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
              <div>
                {segment.videoAssetPath ? (
                  <video
                    controls
                    preload="metadata"
                    className="w-full rounded-xl border border-(--color-border) bg-black"
                    poster={
                      segment.thumbnailAssetPath
                        ? getAssetUrl(project.id, segment.thumbnailAssetPath, segment.updatedAt)
                        : undefined
                    }
                  >
                    <source
                      src={getAssetUrl(project.id, segment.videoAssetPath, segment.updatedAt)}
                      type="video/mp4"
                    />
                  </video>
                ) : (
                  <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-(--color-border-muted) bg-(--color-bg-base) text-sm text-(--color-text-muted)">
                    当前 Segment 还没有可播放视频
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
                        [segment.id]: value,
                      }));
                    }}
                    rows={6}
                    className="w-full rounded-xl border border-(--color-border) bg-(--color-bg-base) px-3 py-2 text-sm text-(--color-text-primary) outline-none focus:border-(--color-primary)"
                  />
                </div>
                <div>
                  <p className={metaLabelClass}>模型</p>
                  <p className={metaValueClass}>{segment.model ?? "未生成"}</p>
                </div>
                <div>
                  <p className={metaLabelClass}>Provider</p>
                  <p className={metaValueClass}>{segment.provider ?? "未生成"}</p>
                </div>
                <div>
                  <p className={metaLabelClass}>时长</p>
                  <p className={metaValueClass}>
                    {segment.durationSec !== null ? `${segment.durationSec}s` : "未知"}
                  </p>
                </div>
                <div>
                  <p className={metaLabelClass}>更新时间</p>
                  <p className={metaValueClass}>
                    {new Date(segment.updatedAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  {isDirty && (
                    <button
                      type="button"
                      onClick={() => {
                        void handleSavePrompt(segment);
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
                        void handleRegeneratePrompt(segment);
                      }}
                      disabled={isBusy}
                      className={getButtonClassName({ variant: "warning" })}
                    >
                      重新生成当前段落提示词
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      void handleRegenerate(segment.id);
                    }}
                    disabled={isBusy || isDirty}
                    className={getButtonClassName({ variant: "warning" })}
                  >
                    重新生成当前片段
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleApprove(segment.id);
                    }}
                    disabled={isBusy || segment.status !== "in_review"}
                    className={getButtonClassName({ variant: "success" })}
                  >
                    审核通过当前片段
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
