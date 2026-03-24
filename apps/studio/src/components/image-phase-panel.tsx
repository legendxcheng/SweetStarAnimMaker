import { useEffect, useMemo, useState } from "react";
import type {
  ImageFrameListResponse,
  ProjectDetail,
  SegmentFrameRecord,
  TaskDetail,
} from "@sweet-star/shared";

import { apiClient } from "../services/api-client";
import { ErrorState } from "./error-state";
import { getButtonClassName } from "../styles/button-styles";

const TASK_STATUS_LABELS: Record<TaskDetail["status"], string> = {
  pending: "排队中",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
};

const FRAME_STATUS_LABELS: Record<SegmentFrameRecord["imageStatus"], string> = {
  pending: "待处理",
  generating: "生成中",
  in_review: "待审核",
  approved: "已通过",
  failed: "失败",
};

const FRAME_PLAN_STATUS_LABELS: Record<SegmentFrameRecord["planStatus"], string> = {
  pending: "Prompt 生成中",
  planned: "Prompt 已就绪",
  plan_failed: "Prompt 生成失败",
};

interface ImagePhasePanelProps {
  project: ProjectDetail;
  task: TaskDetail | null;
  taskError: Error | null;
  creatingTask: boolean;
  disableGenerate: boolean;
  onGenerate: () => void;
  onProjectRefresh?: () => void | Promise<void>;
}

interface FrameDraftState {
  promptTextCurrent: string;
  negativePromptTextCurrent: string;
}

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
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<Error | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const [actionBusy, setActionBusy] = useState<
    | {
        kind:
          | "save"
          | "regenerate"
          | "regenerate-all-prompts"
          | "generate"
          | "approve"
          | "approve-all";
        frameId?: string;
      }
    | null
  >(null);
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

      {segmentGroups.map((segment) => (
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

interface FrameEditorCardProps {
  frame: SegmentFrameRecord | null;
  draft: FrameDraftState | undefined;
  actionBusy:
    | {
        kind:
          | "save"
          | "regenerate"
          | "regenerate-all-prompts"
          | "generate"
          | "approve"
          | "approve-all";
        frameId?: string;
      }
    | null;
  metaLabelClass: string;
  metaValueClass: string;
  onDraftChange: (frameId: string, nextDraft: FrameDraftState) => void;
  onSavePrompt: (frame: SegmentFrameRecord) => Promise<void>;
  onRegeneratePrompt: (frame: SegmentFrameRecord) => Promise<void>;
  onGenerateFrame: (frame: SegmentFrameRecord) => Promise<void>;
  onApproveFrame: (frame: SegmentFrameRecord) => Promise<void>;
}

function FrameEditorCard({
  frame,
  draft,
  actionBusy,
  metaLabelClass,
  metaValueClass,
  onDraftChange,
  onSavePrompt,
  onRegeneratePrompt,
  onGenerateFrame,
  onApproveFrame,
}: FrameEditorCardProps) {
  if (!frame || !draft) {
    return (
      <div className="rounded-xl border border-dashed border-(--color-border-muted) bg-(--color-bg-base) p-4">
        <p className="text-sm text-(--color-text-muted)">当前 Segment 缺少帧记录。</p>
      </div>
    );
  }

  const frameLabel = frame.frameType === "start_frame" ? "起始帧" : "结束帧";
  const isPromptPending = frame.planStatus === "pending";
  const visiblePromptText = isPromptPending ? "" : draft.promptTextCurrent;
  const visibleNegativePromptText = isPromptPending ? "" : draft.negativePromptTextCurrent;
  const canSavePrompt = !isPromptPending && draft.promptTextCurrent.trim().length > 0;
  const canGenerateFrame =
    frame.planStatus === "planned" && frame.promptTextCurrent.trim().length > 0;
  const canApproveFrame = frame.imageAssetPath !== null;
  const isBusy =
    actionBusy?.kind === "approve-all" ||
    actionBusy?.kind === "regenerate-all-prompts" ||
    (actionBusy?.frameId === frame.id &&
      (actionBusy.kind === "save" ||
        actionBusy.kind === "regenerate" ||
        actionBusy.kind === "generate" ||
        actionBusy.kind === "approve"));

  return (
    <section className="rounded-xl border border-(--color-border-muted) bg-(--color-bg-base) p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h5 className="text-base font-semibold text-(--color-text-primary)">{frameLabel}</h5>
          <p className="text-sm text-(--color-text-muted) mt-1">
            当前状态：{FRAME_STATUS_LABELS[frame.imageStatus]}
          </p>
          <p className="text-sm text-(--color-text-muted) mt-1">
            Prompt 状态：{FRAME_PLAN_STATUS_LABELS[frame.planStatus]}
          </p>
        </div>
        <div className="text-right">
          <p className={metaLabelClass}>Frame ID</p>
          <p className={`${metaValueClass} font-mono text-xs`}>{frame.id}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <div>
          <p className={metaLabelClass}>图像资源</p>
          <p className={`${metaValueClass} break-all`}>{frame.imageAssetPath ?? "尚未生成"}</p>
        </div>
        <div>
          <p className={metaLabelClass}>模型</p>
          <p className={metaValueClass}>{frame.model ?? "未生成"}</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="block">
            <span className={metaLabelClass}>{frameLabel}提示词</span>
            <textarea
              value={visiblePromptText}
              onChange={(event) =>
                onDraftChange(frame.id, {
                  ...draft,
                  promptTextCurrent: event.target.value,
                })
              }
              disabled={isBusy || isPromptPending}
              className="w-full min-h-32 rounded-xl border border-(--color-border) bg-(--color-bg-surface) px-3 py-3 text-sm text-(--color-text-primary)"
            />
          </label>
        </div>

        <div>
          <label className="block">
            <span className={metaLabelClass}>{frameLabel}负面提示词</span>
            <textarea
              aria-label={`${frameLabel}负面提示词`}
              value={visibleNegativePromptText}
              onChange={(event) =>
                onDraftChange(frame.id, {
                  ...draft,
                  negativePromptTextCurrent: event.target.value,
                })
              }
              disabled={isBusy || isPromptPending}
              className="w-full min-h-24 rounded-xl border border-(--color-border) bg-(--color-bg-surface) px-3 py-3 text-sm text-(--color-text-primary)"
            />
          </label>
        </div>

        <div className="grid gap-3">
          <div>
            <p className={metaLabelClass}>已匹配参考图</p>
            {frame.matchedReferenceImagePaths.length > 0 ? (
              <div className="grid gap-2">
                {frame.matchedReferenceImagePaths.map((imagePath) => (
                  <p key={imagePath} className={`${metaValueClass} break-all`}>
                    {imagePath}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-(--color-text-muted)">暂无匹配参考图</p>
            )}
          </div>

          {frame.unmatchedCharacterIds.length > 0 && (
            <div className="rounded-lg border border-(--color-warning)/30 bg-(--color-warning)/10 px-3 py-3">
              <p className="text-sm font-semibold text-(--color-warning)">未匹配角色</p>
              <p className="text-sm text-(--color-warning) mt-1">
                {frame.unmatchedCharacterIds.join("、")}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void onSavePrompt(frame);
            }}
            disabled={isBusy || !canSavePrompt}
            className={getButtonClassName({ variant: "secondary" })}
          >
            保存{frameLabel}提示词
          </button>
          <button
            type="button"
            onClick={() => {
              void onRegeneratePrompt(frame);
            }}
            disabled={isBusy || isPromptPending}
            className={getButtonClassName({ variant: "warning" })}
          >
            重新生成{frameLabel} Prompt
          </button>
          <button
            type="button"
            onClick={() => {
              void onGenerateFrame(frame);
            }}
            disabled={isBusy || !canGenerateFrame}
            className={getButtonClassName()}
          >
            生成{frameLabel}图片
          </button>
          <button
            type="button"
            onClick={() => {
              void onApproveFrame(frame);
            }}
            disabled={isBusy || !canApproveFrame}
            className={getButtonClassName({ variant: "success" })}
          >
            审核通过{frameLabel}
          </button>
        </div>

        {!canGenerateFrame && frame.planStatus === "pending" && (
          <p className="text-sm text-(--color-text-muted)">
            Prompt 仍在生成，完成前不能生成图片。
          </p>
        )}
      </div>
    </section>
  );
}

function createFrameDraft(frame: SegmentFrameRecord): FrameDraftState {
  return {
    promptTextCurrent: frame.promptTextCurrent,
    negativePromptTextCurrent: frame.negativePromptTextCurrent ?? "",
  };
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
