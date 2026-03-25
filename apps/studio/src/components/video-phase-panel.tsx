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
        kind: "regenerate" | "approve" | "approve-all";
        segmentId?: string;
      }
    | null
  >(null);
  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";
  const batchSummary = project.currentVideoBatch;

  useEffect(() => {
    if (!batchSummary) {
      setVideos([]);
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
  }, [batchSummary?.id, project.id]);

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
  }

  async function refreshProject() {
    await onProjectRefresh?.();
  }

  async function refreshVideos() {
    const response = await apiClient.listVideos(project.id);
    applyVideoListResponse(response);
    setListError(null);
  }

  async function handleRegenerate(segmentId: string) {
    try {
      setActionBusy({ kind: "regenerate", segmentId });
      await apiClient.regenerateVideoSegment(project.id, segmentId);
      await refreshProject();
      await refreshVideos();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleApprove(segmentId: string) {
    try {
      setActionBusy({ kind: "approve", segmentId });
      await apiClient.approveVideoSegment(project.id, segmentId);
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

  const canApproveAll =
    videos.length > 0 &&
    videos.every((segment) => segment.status === "in_review" || segment.status === "approved");

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
        const isBusy =
          actionBusy?.kind === "approve-all" || actionBusy?.segmentId === segment.segmentId;

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
                  <button
                    type="button"
                    onClick={() => {
                      void handleRegenerate(segment.segmentId);
                    }}
                    disabled={isBusy}
                    className={getButtonClassName({ variant: "warning" })}
                  >
                    重新生成当前片段
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleApprove(segment.segmentId);
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
