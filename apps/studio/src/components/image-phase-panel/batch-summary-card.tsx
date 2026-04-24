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
  hasRemainingImageFrames: boolean;
  canGenerateAllFrames: boolean;
  generationStatusSummary: ImageGenerationStatusSummary;
  onRegenerateAllPrompts: () => void;
  onRegenerateFailedPrompts: () => void;
  onGenerateAllFrames: () => void;
  onRegenerateRemainingFrames: () => void;
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
  hasRemainingImageFrames,
  canGenerateAllFrames,
  generationStatusSummary,
  onRegenerateAllPrompts,
  onRegenerateFailedPrompts,
  onGenerateAllFrames,
  onRegenerateRemainingFrames,
  onApproveAll,
  onGenerate,
}: BatchSummaryCardProps) {
  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-(--color-text-primary)">画面工作区</h3>
          <p className="text-sm text-(--color-text-muted) mt-1">
            每个 Segment 维护起始帧，以及可选的结束帧两张关键画面，支持逐帧编辑 Prompt、出图，并按 Segment 完成审核。
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
              onClick={onRegenerateRemainingFrames}
              disabled={actionBusy || !hasRemainingImageFrames}
              className={getButtonClassName({ variant: "warning" })}
            >
              重新生成余下的帧
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
            <p className={metaLabelClass}>Segment 数量</p>
            <p className={metaValueClass}>{batchSummary.segmentCount}</p>
          </div>
          <div>
            <p className={metaLabelClass}>已通过 Segment</p>
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
          镜头脚本通过后，可以在这里为每个 Segment 生成起始帧和可选结束帧。
        </p>
      )}
    </div>
  );
}
