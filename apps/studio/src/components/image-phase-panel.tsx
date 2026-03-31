import { useEffect, useMemo, useState } from "react";
import type { ImageFrameListResponse, ShotReferenceFrame, ShotReferenceRecord } from "@sweet-star/shared";

import { apiClient } from "../services/api-client";
import { getButtonClassName } from "../styles/button-styles";
import { ErrorState } from "./error-state";
import { TASK_STATUS_LABELS } from "./image-phase-panel/constants";
import { FrameEditorCard } from "./image-phase-panel/frame-editor-card";
import type {
  FrameDraftState,
  ImagePhaseActionBusy,
  ImagePhasePanelProps,
  SegmentShotGroup,
} from "./image-phase-panel/types";
import {
  buildShotDisplayLabel,
  createFrameDraft,
  getFrameGenerationStatusSummary,
  getRequiredFrames,
  getShotSceneId,
  getShotSegmentId,
  getShotSegmentOrder,
  isFramePromptFailed,
  isFramePromptPending,
  isShotReadyForApproval,
  normalizeOptionalText,
  replaceFrameOnShot,
  sortShotsByHierarchy,
} from "./image-phase-panel/utils";

export function ImagePhasePanel({
  project,
  task,
  taskError,
  creatingTask,
  disableGenerate,
  onGenerate,
  onProjectRefresh,
}: ImagePhasePanelProps) {
  const endFrameDependencyMessage =
    "请先生成首帧，尾帧会自动引用首帧结果图以保持一致性。";
  const [shots, setShots] = useState<ShotReferenceRecord[]>([]);
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

  const frames = useMemo(
    () => shots.flatMap((shot) => getRequiredFrames(shot)),
    [shots],
  );
  const hasPendingFramePlans = frames.some((frame) => isFramePromptPending(frame));
  const hasFailedPromptFrames = frames.some((frame) => isFramePromptFailed(frame));
  const hasFailedImageFrames = frames.some(
    (frame) => frame.planStatus === "planned" && frame.imageStatus === "failed",
  );
  const canGenerateAllFrames =
    shots.length > 0 &&
    shots.every((shot) => {
      const canGenerateStartFrame =
        shot.startFrame.planStatus === "planned" &&
        shot.startFrame.promptTextCurrent.trim().length > 0;

      if (!canGenerateStartFrame) {
        return false;
      }

      if (!shot.endFrame) {
        return true;
      }

      return (
        shot.endFrame.planStatus === "planned" && shot.endFrame.promptTextCurrent.trim().length > 0
      );
    });
  const generationStatusSummary = getFrameGenerationStatusSummary(shots);

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

    void loadShots();

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

  const segmentGroups = useMemo<SegmentShotGroup[]>(() => {
    const groups = new Map<string, SegmentShotGroup>();

    for (const shot of shots) {
      const sceneId = getShotSceneId(shot);
      const segmentId = getShotSegmentId(shot);
      const segmentOrder = getShotSegmentOrder(shot);
      const key = `${sceneId}:${segmentId}`;
      const group = groups.get(key);

      if (group) {
        group.shots.push(shot);
        continue;
      }

      groups.set(key, {
        segmentId,
        sceneId,
        segmentOrder: segmentOrder ?? undefined,
        shots: [shot],
      });
    }

    return Array.from(groups.values()).sort((left, right) => {
      if (
        left.segmentOrder !== undefined &&
        right.segmentOrder !== undefined &&
        left.segmentOrder !== right.segmentOrder
      ) {
        return left.segmentOrder - right.segmentOrder;
      }

      return left.segmentId.localeCompare(right.segmentId, "zh-CN", {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [shots]);

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
    [activeSceneId, segmentGroups],
  );

  function applyImageListResponse(response: ImageFrameListResponse) {
    const nextShots = sortShotsByHierarchy(response.shots);
    const nextFrames = nextShots.flatMap((shot) => getRequiredFrames(shot));

    setShots(nextShots);
    setDrafts((currentDrafts) => {
      const nextDrafts: Record<string, FrameDraftState> = {};
      const previousFramesById = new Map(frames.map((frame) => [frame.id, frame]));

      for (const frame of nextFrames) {
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

  function updateFrame(nextFrame: ShotReferenceFrame) {
    setShots((currentShots) => currentShots.map((shot) => replaceFrameOnShot(shot, nextFrame)));
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [nextFrame.id]: createFrameDraft(nextFrame),
    }));
  }

  async function refreshProject() {
    await onProjectRefresh?.();
  }

  async function loadImageList() {
    const response = await apiClient.listImages(project.id);

    applyImageListResponse(response);
    setListError(null);
    return response;
  }

  async function refreshShots() {
    await loadImageList();
  }

  async function handleSavePrompt(frame: ShotReferenceFrame) {
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

  async function handleRegeneratePrompt(frame: ShotReferenceFrame) {
    try {
      setActionBusy({ kind: "regenerate", frameId: frame.id });
      await apiClient.regenerateImageFramePrompt(project.id, frame.id);
      await refreshShots();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleGenerateFrame(frame: ShotReferenceFrame) {
    try {
      setActionBusy({ kind: "generate", frameId: frame.id });
      await apiClient.generateImageFrame(project.id, frame.id);
      await refreshProject();
      await refreshShots();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleApproveShot(shot: ShotReferenceRecord) {
    try {
      setActionBusy({ kind: "approve", shotId: shot.id });
      await apiClient.approveImageFrame(project.id, shot.startFrame.id);
      await refreshShots();
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
      await refreshShots();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleRegenerateFailedPrompts() {
    if (!batchSummary || !hasFailedPromptFrames) {
      return;
    }

    try {
      setActionBusy({ kind: "regenerate-failed-prompts" });
      await apiClient.regenerateFailedImagePrompts(project.id);
      await refreshShots();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleRegenerateFailedFrames() {
    if (!batchSummary || !hasFailedImageFrames) {
      return;
    }

    try {
      setActionBusy({ kind: "regenerate-failed-frames" });
      await apiClient.regenerateFailedImageFrames(project.id);
      await refreshProject();
      await refreshShots();
      setActionError(null);
    } catch (error) {
      setActionError(error as Error);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleGenerateAllFrames() {
    if (!batchSummary || !canGenerateAllFrames) {
      return;
    }

    try {
      setActionBusy({ kind: "generate-all-frames" });
      await apiClient.generateAllImageFrames(project.id);
      await refreshProject();
      await refreshShots();
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
              每个 Shot 根据镜头依赖维护一组关键参考帧，支持逐帧编辑 Prompt、出图，并按镜头完成审核。
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
                重新生成全部 Prompt
              </button>
            )}
            {batchSummary && (
              <button
                type="button"
                onClick={() => {
                  void handleRegenerateFailedPrompts();
                }}
                disabled={actionBusy !== null || !hasFailedPromptFrames}
                className={getButtonClassName({ variant: "warning" })}
              >
                重新生成失败的Prompt
              </button>
            )}
            {batchSummary && segmentGroups.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  void handleGenerateAllFrames();
                }}
                disabled={actionBusy !== null || !canGenerateAllFrames}
                className={getButtonClassName({ variant: "warning" })}
              >
                重新生成全部帧
              </button>
            )}
            {batchSummary && (
              <button
                type="button"
                onClick={() => {
                  void handleRegenerateFailedFrames();
                }}
                disabled={actionBusy !== null || !hasFailedImageFrames}
                className={getButtonClassName({ variant: "warning" })}
              >
                重新生成失败的帧
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
            <div>
              <p className={metaLabelClass}>当前生成状态</p>
              <p className={metaValueClass}>{generationStatusSummary.summary}</p>
              {generationStatusSummary.detail ? (
                <p className="text-xs text-(--color-text-muted) mt-1 break-words">
                  {generationStatusSummary.detail}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-(--color-text-muted)">
            镜头脚本通过后，可以在这里为每个 Shot 生成关键参考帧。
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
          <p className="text-sm text-(--color-text-muted)">正在加载画面...</p>
        </div>
      )}

      {batchSummary && !listLoading && segmentGroups.length === 0 && !listError && (
        <div className={cardClass}>
          <p className="text-sm text-(--color-text-muted)">还没有可编辑的 Shot 参考图。</p>
        </div>
      )}

      {sceneIds.length > 1 && (
        <nav aria-label="Scene 导航" className="mb-4 shrink-0 flex gap-1 overflow-x-auto overflow-y-hidden rounded-xl bg-(--color-bg-surface) border border-(--color-border) p-1.5">
          {sceneIds.map((sceneId) => {
            const isActive = sceneId === activeSceneId;
            const count = sceneSegmentCounts.get(sceneId) ?? 0;

            return (
              <button
                key={sceneId}
                type="button"
                onClick={() => setActiveSceneId(sceneId)}
                className={[
                  "relative shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200",
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

      {activeSegmentGroups.map((segment, index) => (
        <article key={`${segment.sceneId}:${segment.segmentId}`} className={cardClass}>
          <div className="mb-4">
            <h4 className="text-base font-semibold text-(--color-text-primary)">
              Segment {segment.segmentOrder ?? index + 1}
            </h4>
            <p className="text-sm text-(--color-text-muted) mt-1">
              {segment.sceneId} / {segment.segmentId}
            </p>
          </div>

          <div className="grid gap-4">
            {segment.shots.map((shot) => {
              const shotBusy =
                actionBusy?.kind === "approve-all" ||
                actionBusy?.kind === "regenerate-all-prompts" ||
                actionBusy?.kind === "regenerate-failed-prompts" ||
                actionBusy?.kind === "regenerate-failed-frames" ||
                actionBusy?.kind === "generate-all-frames" ||
                (actionBusy?.kind === "approve" && actionBusy.shotId === shot.id);
              const canApproveShot =
                shot.referenceStatus !== "approved" && isShotReadyForApproval(shot);
              const isEndFrameGenerationBlocked =
                shot.frameDependency === "start_and_end_frame" && !shot.startFrame.imageAssetPath;

              return (
                <section
                  key={shot.id}
                  className="rounded-xl border border-(--color-border-muted) bg-(--color-bg-base) p-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h5 className="text-base font-semibold text-(--color-text-primary)">
                        {buildShotDisplayLabel(shot)}
                      </h5>
                      <p className="text-sm text-(--color-text-muted) mt-1">
                        Shot Code: {shot.shotCode}
                      </p>
                      <p className="text-sm text-(--color-text-muted)">
                        Shot ID: {shot.shotId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={metaLabelClass}>镜头依赖</p>
                      <p className={metaValueClass}>
                        {shot.frameDependency === "start_frame_only"
                          ? "仅起始帧"
                          : "起始帧 + 结束帧"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <FrameEditorCard
                      projectId={project.id}
                      visualStyleText={project.premise.visualStyleText ?? ""}
                      frame={shot.startFrame}
                      draft={drafts[shot.startFrame.id]}
                      busy={
                        shotBusy ||
                        (actionBusy?.frameId === shot.startFrame.id &&
                          (actionBusy.kind === "save" ||
                            actionBusy.kind === "regenerate" ||
                            actionBusy.kind === "generate"))
                      }
                      generationBlocked={false}
                      metaLabelClass={metaLabelClass}
                      metaValueClass={metaValueClass}
                      onDraftChange={(frameId, nextDraft) => {
                        setDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [frameId]: nextDraft,
                        }));
                      }}
                      onSavePrompt={handleSavePrompt}
                      onRegeneratePrompt={handleRegeneratePrompt}
                      onGenerateFrame={handleGenerateFrame}
                    />
                    {shot.endFrame && (
                      <FrameEditorCard
                        projectId={project.id}
                        visualStyleText={project.premise.visualStyleText ?? ""}
                        frame={shot.endFrame}
                        draft={drafts[shot.endFrame.id]}
                        busy={
                          shotBusy ||
                          (actionBusy?.frameId === shot.endFrame.id &&
                            (actionBusy.kind === "save" ||
                              actionBusy.kind === "regenerate" ||
                              actionBusy.kind === "generate"))
                        }
                        generationBlocked={isEndFrameGenerationBlocked}
                        generationBlockedMessage={
                          isEndFrameGenerationBlocked ? endFrameDependencyMessage : undefined
                        }
                        metaLabelClass={metaLabelClass}
                        metaValueClass={metaValueClass}
                        onDraftChange={(frameId, nextDraft) => {
                          setDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [frameId]: nextDraft,
                          }));
                        }}
                        onSavePrompt={handleSavePrompt}
                        onRegeneratePrompt={handleRegeneratePrompt}
                        onGenerateFrame={handleGenerateFrame}
                      />
                    )}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        void handleApproveShot(shot);
                      }}
                      disabled={shotBusy || !canApproveShot}
                      className={getButtonClassName({ variant: "success" })}
                    >
                      审核通过当前镜头
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}
