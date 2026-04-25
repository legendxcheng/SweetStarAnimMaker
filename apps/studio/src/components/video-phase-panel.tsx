import { useEffect, useState } from "react";
import type {
  FinalCutRecord,
  ProjectDetail,
  SegmentVideoRecord,
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
import {
  isSegmentVideoApprovedOrReady,
  isSegmentVideoUnfinished,
  sortSegmentsByHierarchy,
} from "./video-phase-panel/utils";
import { VideoSegmentCard } from "./video-phase-panel/video-segment-card";

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
  const [segments, setSegments] = useState<SegmentVideoRecord[]>([]);
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
  const allSegmentsApproved =
    batchSummary !== null &&
    batchSummary.segmentCount > 0 &&
    batchSummary.approvedSegmentCount === batchSummary.segmentCount;

  useEffect(() => {
    if (!batchSummary) {
      setSegments([]);
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

    async function loadSegments() {
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

    void loadSegments();

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
    batchSummary?.approvedSegmentCount,
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

  function applyVideoListResponse(
    response: VideoListResponse,
    options: { forceDraftSync?: boolean } = {},
  ) {
    setSegments(sortSegmentsByHierarchy(response.segments));
    setDrafts((currentDrafts) => {
      const nextDrafts: Record<string, string> = {};
      const previousSegmentsById = new Map(segments.map((segment) => [segment.id, segment]));

      for (const segment of response.segments) {
        const currentDraft = currentDrafts[segment.id];
        const previousSegment = previousSegmentsById.get(segment.id);
        const shouldSyncWithServer =
          options.forceDraftSync === true ||
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

  function updateSegment(nextSegment: SegmentVideoRecord) {
    setSegments((currentSegments) =>
      sortSegmentsByHierarchy(
        currentSegments.map((segment) => (segment.id === nextSegment.id ? nextSegment : segment)),
      ),
    );
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [nextSegment.id]: nextSegment.promptTextCurrent,
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

  async function handleGenerate(segmentId: string) {
    try {
      setActionBusy({ kind: "generate", segmentId });
      await apiClient.generateVideoSegment(project.id, segmentId);
      await refreshProject();
      await refreshVideos();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleSaveConfig(segment: SegmentVideoRecord) {
    const promptTextCurrent = drafts[segment.id]?.trim() ?? "";

    if (!promptTextCurrent) {
      return;
    }

    try {
      setActionBusy({ kind: "save-config", segmentId: segment.id });
      const updatedSegment = await apiClient.saveSegmentVideoConfig(project.id, segment.id, {
        promptTextCurrent,
        referenceImages: segment.referenceImages,
        referenceAudios: segment.referenceAudios,
      });

      updateSegment(updatedSegment);
      await refreshProject();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleUploadAudio(segment: SegmentVideoRecord, file: File) {
    try {
      setActionBusy({ kind: "upload-audio", segmentId: segment.id });
      const updatedSegment = await apiClient.uploadSegmentReferenceAudio(project.id, segment.id, file);
      updateSegment(updatedSegment);
      await refreshProject();
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

  async function handleRegenerateAllPrompts() {
    if (!batchSummary) {
      return;
    }

    const previousDraftsForRollback = drafts;

    try {
      setActionBusy({ kind: "regenerate-all-prompts" });
      setDrafts((currentDrafts) => {
        const nextDrafts: Record<string, string> = {};

        for (const segment of segments) {
          nextDrafts[segment.id] = "";
        }

        for (const segmentId of Object.keys(currentDrafts)) {
          if (nextDrafts[segmentId] === undefined) {
            nextDrafts[segmentId] = currentDrafts[segmentId];
          }
        }

        return nextDrafts;
      });
      const response = await apiClient.regenerateAllVideoPrompts(project.id);

      applyVideoListResponse(response, { forceDraftSync: true });
      await refreshProject();
      setActionError(null);
    } catch (error) {
      setDrafts(previousDraftsForRollback);
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleGenerateAllVideos() {
    if (!batchSummary || segments.length === 0) {
      return;
    }

    try {
      setActionBusy({ kind: "regenerate-all-videos" });

      for (const segment of segments.filter(isSegmentVideoUnfinished)) {
        await apiClient.generateVideoSegment(project.id, segment.id);
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
    if (!allSegmentsApproved) {
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
    segments.length > 0 &&
    segments.every((segment) => isSegmentVideoApprovedOrReady(segment));
  const hasDirtyPrompts = segments.some(
    (segment) => (drafts[segment.id] ?? segment.promptTextCurrent) !== segment.promptTextCurrent,
  );
  const unfinishedSegmentCount = segments.filter(isSegmentVideoUnfinished).length;

  return (
    <section aria-label="视频工作区">
      <div className={CARD_CLASS}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-(--color-text-primary)">视频工作区</h3>
            <p className="mt-1 text-sm text-(--color-text-muted)">
              每个 Segment 维护一份可编辑视频配置，支持逐片段生成、审核和整批收口。
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
                重新生成所有片段提示词
              </button>
            )}
            {batchSummary && segments.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  void handleGenerateAllVideos();
                }}
                disabled={actionBusy !== null || hasDirtyPrompts || unfinishedSegmentCount === 0}
                className={getButtonClassName({ variant: "warning" })}
              >
                生成余下视频片段
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
                全部片段审核通过
              </button>
            )}
            {!batchSummary && (
              <button
                type="button"
                onClick={onGenerate}
                disabled={disableGenerate}
                className={getButtonClassName()}
              >
                {creatingTask ? "启动中..." : "开始生成视频片段配置"}
              </button>
            )}
          </div>
        </div>

        {batchSummary ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className={META_LABEL_CLASS}>Segment 数量</p>
              <p className={META_VALUE_CLASS}>{batchSummary.segmentCount}</p>
            </div>
            <div>
              <p className={META_LABEL_CLASS}>已通过片段</p>
              <p className={META_VALUE_CLASS}>
                {batchSummary.approvedSegmentCount}/{batchSummary.segmentCount}
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
            当前阶段会先为每个 Segment 生成可编辑视频配置，确认后再逐片段或整批生成视频。
          </p>
        )}
      </div>

      {batchSummary && (
        <FinalCutCard
          allShotsApproved={allSegmentsApproved}
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
        <div className="mb-4 rounded-xl border border-(--color-warning)/30 bg-(--color-warning)/10 p-4">
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

      {batchSummary && !listLoading && segments.length === 0 && !listError && (
        <div className={CARD_CLASS}>
          <p className="text-sm text-(--color-text-muted)">当前批次还没有可审核的视频片段。</p>
        </div>
      )}

      {segments.map((segment) => {
        const promptDraft = drafts[segment.id] ?? segment.promptTextCurrent;
        const isDirty = promptDraft !== segment.promptTextCurrent;
        const isBusy =
          actionBusy?.kind === "approve-all" ||
          actionBusy?.kind === "regenerate-all-prompts" ||
          actionBusy?.kind === "regenerate-all-videos" ||
          actionBusy?.segmentId === segment.id;

        return (
          <VideoSegmentCard
            key={segment.id}
            cardClass={CARD_CLASS}
            isBusy={isBusy}
            isDirty={isDirty}
            metaLabelClass={META_LABEL_CLASS}
            metaValueClass={META_VALUE_CLASS}
            onApprove={() => {
              void handleApprove(segment.id);
            }}
            onDraftChange={(value) => {
              setDrafts((currentDrafts) => ({
                ...currentDrafts,
                [segment.id]: value,
              }));
            }}
            onGenerate={() => {
              void handleGenerate(segment.id);
            }}
            onSaveConfig={() => {
              void handleSaveConfig(segment);
            }}
            onUploadAudio={(file) => {
              void handleUploadAudio(segment, file);
            }}
            projectId={project.id}
            promptDraft={promptDraft}
            segment={segment}
          />
        );
      })}
    </section>
  );
}
