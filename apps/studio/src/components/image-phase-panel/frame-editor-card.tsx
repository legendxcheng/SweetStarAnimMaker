import { useState } from "react";

import { config } from "../../services/config";
import { getButtonClassName } from "../../styles/button-styles";
import { FRAME_PLAN_STATUS_LABELS, FRAME_STATUS_LABELS } from "./constants";
import type { FrameEditorCardProps } from "./types";
import { getFrameImageUrl } from "./utils";

export function FrameEditorCard({
  projectId,
  frame,
  draft,
  busy,
  metaLabelClass,
  metaValueClass,
  onDraftChange,
  onSavePrompt,
  onRegeneratePrompt,
  onGenerateFrame,
}: FrameEditorCardProps) {
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  if (!frame || !draft) {
    return (
      <div className="rounded-xl border border-dashed border-(--color-border-muted) bg-(--color-bg-base) p-4">
        <p className="text-sm text-(--color-text-muted)">当前 Shot 缺少帧记录。</p>
      </div>
    );
  }

  const frameLabel = frame.frameType === "start_frame" ? "起始帧" : "结束帧";
  const frameImageUrl = getFrameImageUrl(projectId, frame);
  const isPromptPending = frame.planStatus === "pending";
  const isGenerating = frame.imageStatus === "generating";
  const visiblePromptText = isPromptPending ? "" : draft.promptTextCurrent;
  const visibleNegativePromptText = isPromptPending ? "" : draft.negativePromptTextCurrent;
  const canSavePrompt = !isPromptPending && draft.promptTextCurrent.trim().length > 0;
  const canGenerateFrame =
    frame.planStatus === "planned" && frame.promptTextCurrent.trim().length > 0;

  return (
    <section
      className={`rounded-xl border ${isGenerating ? "border-(--color-accent) ring-1 ring-(--color-accent)/50 shadow-md shadow-(--color-accent)/20" : "border-(--color-border-muted)"} bg-(--color-bg-base) p-4 transition-all duration-300`}
    >
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
        <div className="sm:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className={metaLabelClass}>图像资源</p>
              <p className="text-sm text-(--color-text-muted)">点击缩略图或按钮查看大图。</p>
            </div>
            <button
              type="button"
              onClick={() => setImagePreviewOpen(true)}
              disabled={!frame.imageAssetPath}
              className={getButtonClassName({
                variant: "secondary",
                size: "compact",
              })}
            >
              查看大图
            </button>
          </div>
          {frame.imageAssetPath ? (
            <div className="relative block w-full overflow-hidden rounded-xl border border-(--color-border) bg-(--color-bg-surface)">
              {isGenerating && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-full border-4 border-(--color-border) border-t-(--color-accent) animate-spin mb-2"></div>
                  <p className="text-sm font-medium text-white shadow-sm tracking-widest">
                    图片生成中...
                  </p>
                </div>
              )}
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => setImagePreviewOpen(true)}
                className="block w-full"
              >
                <img
                  src={frameImageUrl}
                  alt={`${frameLabel}结果图`}
                  className={`h-48 w-full object-contain transition-all duration-300 ${isGenerating ? "bg-(--color-bg-surface) opacity-50 grayscale" : "bg-(--color-bg-elevated)"}`}
                />
              </button>
            </div>
          ) : (
            <div
              className={`relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border ${isGenerating ? "border-solid border-(--color-border) bg-(--color-bg-elevated)" : "border-dashed border-(--color-border-muted) bg-(--color-bg-surface)"}`}
            >
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center w-full h-full">
                  <div className="w-8 h-8 rounded-full border-4 border-(--color-border-muted) border-t-(--color-accent) animate-spin mb-3"></div>
                  <p className="text-sm font-medium text-(--color-accent) animate-pulse tracking-wide">
                    图片生成中...
                  </p>
                </div>
              ) : (
                <p className="text-sm text-(--color-text-muted)">尚未生成{frameLabel}图片</p>
              )}
            </div>
          )}
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
              disabled={busy || isPromptPending}
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
              disabled={busy || isPromptPending}
              className="w-full min-h-24 rounded-xl border border-(--color-border) bg-(--color-bg-surface) px-3 py-3 text-sm text-(--color-text-primary)"
            />
          </label>
        </div>

        <div className="grid gap-3">
          <div>
            <p className={metaLabelClass}>已匹配参考图</p>
            {frame.matchedReferenceImagePaths.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {frame.matchedReferenceImagePaths.map((imagePath) => (
                  <div
                    key={imagePath}
                    className="rounded-xl border border-(--color-border) bg-(--color-bg-base) p-2 text-center"
                  >
                    <img
                      src={config.projectAssetContentUrl(projectId, imagePath)}
                      alt="参考图"
                      className="h-24 mx-auto mb-2 rounded object-cover"
                    />
                    <p
                      className={`${metaValueClass} break-all text-xs line-clamp-2`}
                      title={imagePath}
                    >
                      {imagePath.split("/").pop()}
                    </p>
                  </div>
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
            disabled={busy || !canSavePrompt}
            className={getButtonClassName({ variant: "secondary" })}
          >
            保存{frameLabel}提示词
          </button>
          <button
            type="button"
            onClick={() => {
              void onRegeneratePrompt(frame);
            }}
            disabled={busy || isPromptPending}
            className={getButtonClassName({ variant: "warning" })}
          >
            重新生成{frameLabel} Prompt
          </button>
          <button
            type="button"
            onClick={() => {
              void onGenerateFrame(frame);
            }}
            disabled={busy || !canGenerateFrame}
            className={getButtonClassName()}
          >
            生成{frameLabel}图片
          </button>
        </div>

        {!canGenerateFrame && frame.planStatus === "pending" && (
          <p className="text-sm text-(--color-text-muted)">Prompt 仍在生成，完成前不能生成图片。</p>
        )}
      </div>

      {frame.imageAssetPath && imagePreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setImagePreviewOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${frameLabel}结果图大图`}
            className="relative max-h-full w-full max-w-6xl rounded-2xl border border-white/10 bg-(--color-bg-surface) p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-(--color-text-primary)">
                  {frameLabel}结果图预览
                </p>
                <p className="text-sm text-(--color-text-muted)">
                  {frame.imageWidth && frame.imageHeight
                    ? `${frame.imageWidth} × ${frame.imageHeight}`
                    : "原始尺寸"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImagePreviewOpen(false)}
                className={getButtonClassName({
                  variant: "secondary",
                  size: "compact",
                })}
              >
                关闭大图预览
              </button>
            </div>

            <div className="max-h-[80vh] overflow-auto rounded-xl bg-black/20">
              <img
                src={frameImageUrl}
                alt={`${frameLabel}结果图大图`}
                className="mx-auto block h-auto max-w-full rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
