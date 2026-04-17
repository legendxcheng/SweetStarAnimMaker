import { useEffect, useMemo, useState } from "react";
import type { ImageFrameListResponse, ShotReferenceFrame, ShotReferenceRecord } from "@sweet-star/shared";

import { apiClient } from "../services/api-client";
import { ErrorState } from "./error-state";
import { BatchSummaryCard } from "./image-phase-panel/batch-summary-card";
import { SceneTabs } from "./image-phase-panel/scene-tabs";
import { SegmentSection } from "./image-phase-panel/segment-section";
import { TaskStatusCard } from "./image-phase-panel/task-status-card";
import type {
  FrameDraftMap,
  FrameDraftState,
  ImagePhaseActionBusy,
  ImagePhasePanelProps,
  SegmentShotGroup,
} from "./image-phase-panel/types";
import {
  createFrameDraft,
  getFrameGenerationStatusSummary,
  getRequiredFrames,
  getShotSceneId,
  getShotSegmentId,
  getShotSegmentOrder,
  isFramePromptFailed,
  isFramePromptPending,
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
  const [drafts, setDrafts] = useState<FrameDraftMap>({});
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
      const nextDrafts: FrameDraftMap = {};
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

  function handleDraftChange(frameId: string, nextDraft: FrameDraftState) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [frameId]: nextDraft,
    }));
  }

  return (
    <section aria-label="画面工作区">
      <BatchSummaryCard
        cardClass={cardClass}
        metaLabelClass={metaLabelClass}
        metaValueClass={metaValueClass}
        batchSummary={batchSummary}
        actionBusy={actionBusy !== null}
        creatingTask={creatingTask}
        disableGenerate={disableGenerate}
        segmentGroupCount={segmentGroups.length}
        hasFailedPromptFrames={hasFailedPromptFrames}
        hasFailedImageFrames={hasFailedImageFrames}
        canGenerateAllFrames={canGenerateAllFrames}
        generationStatusSummary={generationStatusSummary}
        onRegenerateAllPrompts={() => {
          void handleRegenerateAllPrompts();
        }}
        onRegenerateFailedPrompts={() => {
          void handleRegenerateFailedPrompts();
        }}
        onGenerateAllFrames={() => {
          void handleGenerateAllFrames();
        }}
        onRegenerateFailedFrames={() => {
          void handleRegenerateFailedFrames();
        }}
        onApproveAll={() => {
          void handleApproveAll();
        }}
        onGenerate={onGenerate}
      />

      {task && (
        <TaskStatusCard
          cardClass={cardClass}
          metaLabelClass={metaLabelClass}
          metaValueClass={metaValueClass}
          task={task}
        />
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

      <SceneTabs
        sceneIds={sceneIds}
        activeSceneId={activeSceneId}
        sceneSegmentCounts={sceneSegmentCounts}
        onSelectScene={setActiveSceneId}
      />

      {activeSegmentGroups.map((segment, index) => (
        <SegmentSection
          key={`${segment.sceneId}:${segment.segmentId}`}
          cardClass={cardClass}
          projectId={project.id}
          visualStyleText={project.premise.visualStyleText ?? ""}
          segment={segment}
          index={index}
          drafts={drafts}
          actionBusy={actionBusy}
          metaLabelClass={metaLabelClass}
          metaValueClass={metaValueClass}
          endFrameDependencyMessage={endFrameDependencyMessage}
          onDraftChange={handleDraftChange}
          onSavePrompt={handleSavePrompt}
          onRegeneratePrompt={handleRegeneratePrompt}
          onGenerateFrame={handleGenerateFrame}
          onApproveShot={handleApproveShot}
        />
      ))}
    </section>
  );
}
