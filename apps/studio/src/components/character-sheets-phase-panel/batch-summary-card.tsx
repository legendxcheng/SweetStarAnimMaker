import type { ProjectDetail } from "@sweet-star/shared";

import { getButtonClassName } from "../../styles/button-styles";
import { CARD_CLASS, META_LABEL_CLASS, META_VALUE_CLASS } from "./constants";

interface CharacterSheetBatchSummaryCardProps {
  project: ProjectDetail;
  creatingTask: boolean;
  disableGenerate: boolean;
  onGenerate: () => void;
}

export function CharacterSheetBatchSummaryCard({
  project,
  creatingTask,
  disableGenerate,
  onGenerate,
}: CharacterSheetBatchSummaryCardProps) {
  const batchSummary = project.currentCharacterSheetBatch;

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-(--color-text-primary)">角色设定工作区</h3>
          <p className="text-sm text-(--color-text-muted) mt-1">
            生成每个主角的角色三视图，编辑提示词，并逐个审核通过后再进入分镜。
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={disableGenerate}
          className={getButtonClassName()}
        >
          {creatingTask ? "启动中..." : "重新生成"}
        </button>
      </div>

      {batchSummary ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className={META_LABEL_CLASS}>角色数量</p>
            <p className={META_VALUE_CLASS}>{batchSummary.characterCount}</p>
          </div>
          <div>
            <p className={META_LABEL_CLASS}>已通过</p>
            <p className={META_VALUE_CLASS}>
              {batchSummary.approvedCharacterCount}/{batchSummary.characterCount}
            </p>
          </div>
          <div>
            <p className={META_LABEL_CLASS}>更新时间</p>
            <p className={META_VALUE_CLASS}>{new Date(batchSummary.updatedAt).toLocaleString("zh-CN")}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-(--color-text-muted)">
          主情节通过后，可以从这里启动角色三视图生成。
        </p>
      )}
    </div>
  );
}
