import { useEffect, useMemo, useState } from "react";
import type { ImageFrameListResponse, SegmentFrameRecord } from "@sweet-star/shared";

import { apiClient } from "../services/api-client";
import { getButtonClassName } from "../styles/button-styles";
import { ErrorState } from "./error-state";
import { TASK_STATUS_LABELS } from "./image-phase-panel/constants";
import { FrameEditorCard } from "./image-phase-panel/frame-editor-card";
import type {
  FrameDraftState,
  ImagePhaseActionBusy,
  ImagePhasePanelProps,
} from "./image-phase-panel/types";
import { createFrameDraft, normalizeOptionalText } from "./image-phase-panel/utils";

export function ImagePhasePanel({
  project,
  task,
  taskError,
  creatingTask,
  disableGenerate,
  onGenerate,
  onProjectRefresh,
}: ImagePhasePanelProps) {
  const [frames, setFrames] = useState<SegmentFrameRecord[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<Error | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [actionBusy, setActionBusy] = useState<ImagePhaseActionBusy | null>(null);
  const [drafts, setDrafts] = useState<Record<string, FrameDraftState>>({});
  const cardClass =
    "bg-(--color-bg-surface) border border-(--color-border) rounded-xl p-5 mb-4";
  const metaLabelClass = "text-xs text-(--color-text-muted) uppercase tracking-wide mb-0.5";
  const metaValueClass = "text-sm text-(--color-text-primary)";
  const batchSummary = project.currentImageBatch;
  const hasPendingFramePlans = frames.some((frame) => frame.planStatus === "pending");

  useEffect(() => {
    if (!batchSummary) {
      setFrames([]);
      setDrafts({});
      setListError(null);
      setListLoading(false);
      return;
    }

    let cancelled = false;

    async function loadFrames() {
      setListLoading(true);

      try {
        const response = await apiClient.listImages(project.id);

        if (cancelled) {
          return;
        }

        applyImageListResponse(response);
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

    void loadFrames();

    return () => {
      cancelled = true;
    };
  }, [batchSummary?.id, project.id]);

  useEffect(() => {
    if (!batchSummary) {
      return;
    }

    const shouldPoll = project.status === "images_generating" || hasPendingFramePlans;

    if (!shouldPoll) {
      return;
    }

    let cancelled = false;

    const intervalId = setInterval(() => {
      void (async () => {
        try {
          const response = await apiClient.listImages(project.id);

          if (cancelled) {
            return;
          }

          applyImageListResponse(response);
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
  }, [batchSummary?.id, hasPendingFramePlans, project.id, project.status]);

  const segmentGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        segmentId: string;
        sceneId: string;
        order: number;
        frames: SegmentFrameRecord[];
      }
    >();

    for (const frame of frames) {
      const key = `${frame.sceneId}:${frame.segmentId}:${frame.order}`;
      const group = groups.get(key);

      if (group) {
        group.frames.push(frame);
        continue;
      }

      groups.set(key, {
        segmentId: frame.segmentId,
        sceneId: frame.sceneId,
        order: frame.order,
        frames: [frame],
      });
    }

    return Array.from(groups.values())
      .sort((left, right) => left.order - right.order)
      .map((group) => ({
        ...group,
        startFrame:
          group.frames.find((frame) => frame.frameType === "start_frame") ?? null,
        endFrame: group.frames.find((frame) => frame.frameType === "end_frame") ?? null,
      }));
  }, [frames]);

  const sceneIds = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];

    for (const group of segmentGroups) {
      if (!seen.has(group.sceneId)) {
        seen.add(group.sceneId);
        ordered.push(group.sceneId);
      }
    }

    return ordered;
  }, [segmentGroups]);

  const sceneSegmentCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const group of segmentGroups) {
      counts.set(group.sceneId, (counts.get(group.sceneId) ?? 0) + 1);
    }

    return counts;
  }, [segmentGroups]);

  useEffect(() => {
    if (sceneIds.length === 0) {
      setActiveSceneId(null);
      return;
    }

    setActiveSceneId((current) => {
      if (current && sceneIds.includes(current)) {
        return current;
      }

      return sceneIds[0];
    });
  }, [sceneIds]);

  const activeSegmentGroups = useMemo(
    () => segmentGroups.filter((group) => group.sceneId === activeSceneId),
    [segmentGroups, activeSceneId],
  );

  function applyImageListResponse(response: ImageFrameListResponse) {
    setFrames(response.frames);
    setDrafts((currentDrafts) => {
      const nextDrafts: Record<string, FrameDraftState> = {};
      const previousFramesById = new Map(frames.map((frame) => [frame.id, frame]));

      for (const frame of response.frames) {
        const currentDraft = currentDrafts[frame.id];
        const previousFrame = previousFramesById.get(frame.id);
        const shouldSyncWithServer =
          !currentDraft ||
          !previousFrame ||
          (currentDraft.promptTextCurrent === previousFrame.promptTextCurrent &&
            currentDraft.negativePromptTextCurrent ===
              (previousFrame.negativePromptTextCurrent ?? ""));

        nextDrafts[frame.id] = shouldSyncWithServer
          ? createFrameDraft(frame)
          : currentDraft;
      }

      return nextDrafts;
    });
  }

  function updateFrame(nextFrame: SegmentFrameRecord) {
    setFrames((currentFrames) =>
      currentFrames.map((frame) => (frame.id === nextFrame.id ? nextFrame : frame)),
    );
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [nextFrame.id]: createFrameDraft(nextFrame),
    }));
  }

  async function refreshProject() {
    await onProjectRefresh?.();
  }

  async function refreshFrames() {
    const response = await apiClient.listImages(project.id);

    applyImageListResponse(response);
    setListError(null);
  }

  async function handleSavePrompt(frame: SegmentFrameRecord) {
    const draft = drafts[frame.id];

    if (!draft) {
      return;
    }

    try {
      setActionBusy({ kind: "save", frameId: frame.id });
      const updatedFrame = await apiClient.updateImageFramePrompt(project.id, frame.id, {
        promptTextCurrent: draft.promptTextCurrent,
        negativePromptTextCurrent: normalizeOptionalText(draft.negativePromptTextCurrent),
      });

      updateFrame(updatedFrame);
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleRegeneratePrompt(frame: SegmentFrameRecord) {
    try {
      setActionBusy({ kind: "regenerate", frameId: frame.id });
      await apiClient.regenerateImageFramePrompt(project.id, frame.id);
      await refreshFrames();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleGenerateFrame(frame: SegmentFrameRecord) {
    try {
      setActionBusy({ kind: "generate", frameId: frame.id });
      await apiClient.generateImageFrame(project.id, frame.id);
      await refreshProject();
      await refreshFrames();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleApproveFrame(frame: SegmentFrameRecord) {
    try {
      setActionBusy({ kind: "approve", frameId: frame.id });
      const approvedFrame = await apiClient.approveImageFrame(project.id, frame.id);

      updateFrame(approvedFrame);
      setActionError(null);
      await refreshProject();
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleApproveAll() {
    if (!batchSummary) {
      return;
    }

    try {
      setActionBusy({ kind: "approve-all" });
      const response = await apiClient.approveAllImageFrames(project.id);

      applyImageListResponse(response);
      setActionError(null);
      await refreshProject();
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
      await apiClient.regenerateAllImagePrompts(project.id);
      await refreshFrames();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <section aria-label="画面工作区">
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-(--color-text-primary)">画面工作区</h3>
            <p className="text-sm text-(--color-text-muted) mt-1">
              每个 Segment 维护起始帧与结束帧两张关键图，支持逐帧编辑 Prompt、出图与审核。
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
                重新生成当前批次全部 Prompt
              </button>
            )}
            {batchSummary && (
              <button
                type="button"
                onClick={() => {
                  void handleApproveAll();
                }}
                disabled={actionBusy !== null}
                className={getButtonClassName({ variant: "success" })}
              >
                全部画面审核通过
              </button>
            )}
            <button
              type="button"
              onClick={onGenerate}
              disabled={disableGenerate}
              className={getButtonClassName()}
            >
              {creatingTask ? "启动中..." : "重新生成"}
            </button>
          </div>
        </div>

        {batchSummary ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className={metaLabelClass}>Segment 数量</p>
              <p className={metaValueClass}>{batchSummary.segmentCount}</p>
            </div>
            <div>
              <p className={metaLabelClass}>已通过帧数</p>
              <p className={metaValueClass}>
                {batchSummary.approvedFrameCount}/{batchSummary.totalFrameCount}
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
            镜头脚本通过后，可以在这里为每个 Segment 生成起始帧和结束帧。
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

      {project.status === "images_generating" && !task && (
        <div className="bg-(--color-warning)/10 border border-(--color-warning)/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-(--color-warning)">画面生成任务执行中，正在自动刷新项目状态。</p>
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
          <p className="text-sm text-(--color-text-muted)">正在加载当前画面批次...</p>
        </div>
      )}

      {batchSummary && !listLoading && segmentGroups.length === 0 && !listError && (
        <div className={cardClass}>
          <p className="text-sm text-(--color-text-muted)">当前批次还没有可编辑的 Segment 帧。</p>
        </div>
      )}

      {sceneIds.length > 1 && (
        <nav aria-label="Scene 导航" className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-(--color-bg-surface) border border-(--color-border) p-1.5">
          {sceneIds.map((sceneId) => {
            const isActive = sceneId === activeSceneId;
            const count = sceneSegmentCounts.get(sceneId) ?? 0;

            return (
              <button
                key={sceneId}
                type="button"
                onClick={() => setActiveSceneId(sceneId)}
                className={[
                  "relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) shadow-sm"
                    : "text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-bg-elevated)",
                ].join(" ")}
              >
                {sceneId}
                <span
                  className={[
                    "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none min-w-5",
                    isActive
                      ? "bg-(--color-bg-base)/20 text-(--color-bg-base)"
                      : "bg-(--color-border-muted) text-(--color-text-muted)",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {activeSegmentGroups.map((segment) => (
        <article key={`${segment.sceneId}:${segment.segmentId}:${segment.order}`} className={cardClass}>
          <div className="mb-4">
            <h4 className="text-base font-semibold text-(--color-text-primary)">
              Segment {segment.order}
            </h4>
            <p className="text-sm text-(--color-text-muted) mt-1">
              {segment.sceneId} / {segment.segmentId}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <FrameEditorCard
              projectId={project.id}
              frame={segment.startFrame}
              metaLabelClass={metaLabelClass}
              metaValueClass={metaValueClass}
              actionBusy={actionBusy}
              draft={segment.startFrame ? drafts[segment.startFrame.id] : undefined}
              onDraftChange={(frameId, nextDraft) => {
                setDrafts((currentDrafts) => ({
                  ...currentDrafts,
                  [frameId]: nextDraft,
                }));
              }}
              onSavePrompt={handleSavePrompt}
              onRegeneratePrompt={handleRegeneratePrompt}
              onGenerateFrame={handleGenerateFrame}
              onApproveFrame={handleApproveFrame}
            />
            <FrameEditorCard
              projectId={project.id}
              frame={segment.endFrame}
              metaLabelClass={metaLabelClass}
              metaValueClass={metaValueClass}
              actionBusy={actionBusy}
              draft={segment.endFrame ? drafts[segment.endFrame.id] : undefined}
              onDraftChange={(frameId, nextDraft) => {
                setDrafts((currentDrafts) => ({
                  ...currentDrafts,
                  [frameId]: nextDraft,
                }));
              }}
              onSavePrompt={handleSavePrompt}
              onRegeneratePrompt={handleRegeneratePrompt}
              onGenerateFrame={handleGenerateFrame}
              onApproveFrame={handleApproveFrame}
            />
          </div>
        </article>
      ))}
    </section>
  );
}
