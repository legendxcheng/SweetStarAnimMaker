import { getButtonClassName } from "../../styles/button-styles";
import type { ImageBatchSummary, ImageGenerationStatusSummary } from "./types";

interface BatchSummaryCardProps {
  cardClass: string;
  metaLabelClass: string;
  metaValueClass: string;
  batchSummary: ImageBatchSummary | null;
  actionBusy: boolean;
  creatingTask: boolean;
  disableGenerate: boolean;
  segmentGroupCount: number;
  hasFailedPromptFrames: boolean;
  hasFailedImageFrames: boolean;
  canGenerateAllFrames: boolean;
  generationStatusSummary: ImageGenerationStatusSummary;
  onRegenerateAllPrompts: () => void;
  onRegenerateFailedPrompts: () => void;
  onGenerateAllFrames: () => void;
  onRegenerateFailedFrames: () => void;
  onApproveAll: () => void;
  onGenerate: () => void;
}

export function BatchSummaryCard({
  cardClass,
  metaLabelClass,
  metaValueClass,
  batchSummary,
  actionBusy,
  creatingTask,
  disableGenerate,
  segmentGroupCount,
  hasFailedPromptFrames,
  hasFailedImageFrames,
  canGenerateAllFrames,
  generationStatusSummary,
  onRegenerateAllPrompts,
  onRegenerateFailedPrompts,
  onGenerateAllFrames,
  onRegenerateFailedFrames,
  onApproveAll,
  onGenerate,
}: BatchSummaryCardProps) {
  return (
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
              onClick={onRegenerateAllPrompts}
              disabled={actionBusy}
              className={getButtonClassName({ variant: "warning" })}
            >
              重新生成全部 Prompt
            </button>
          )}
          {batchSummary && (
            <button
              type="button"
              onClick={onRegenerateFailedPrompts}
              disabled={actionBusy || !hasFailedPromptFrames}
              className={getButtonClassName({ variant: "warning" })}
            >
              重新生成失败的Prompt
            </button>
          )}
          {batchSummary && segmentGroupCount > 0 && (
            <button
              type="button"
              onClick={onGenerateAllFrames}
              disabled={actionBusy || !canGenerateAllFrames}
              className={getButtonClassName({ variant: "warning" })}
            >
              重新生成全部帧
            </button>
          )}
          {batchSummary && (
            <button
              type="button"
              onClick={onRegenerateFailedFrames}
              disabled={actionBusy || !hasFailedImageFrames}
              className={getButtonClassName({ variant: "warning" })}
            >
              重新生成失败的帧
            </button>
          )}
          {batchSummary && (
            <button
              type="button"
              onClick={onApproveAll}
              disabled={actionBusy}
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
  );
}
