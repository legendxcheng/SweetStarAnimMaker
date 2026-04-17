import type { FinalCutRecord, ProjectDetail, TaskDetail } from "@sweet-star/shared";

import { getButtonClassName } from "../../styles/button-styles";
import { META_LABEL_CLASS, META_VALUE_CLASS, TASK_STATUS_LABELS } from "./constants";
import { getAssetUrl } from "./utils";

interface FinalCutCardProps {
  allShotsApproved: boolean;
  batchSummary: NonNullable<ProjectDetail["currentVideoBatch"]>;
  cardClass: string;
  finalCut: FinalCutRecord | null;
  finalCutLoading: boolean;
  finalCutTask: TaskDetail | null;
  onGenerateFinalCut: () => void;
  projectId: string;
}

export function FinalCutCard({
  allShotsApproved,
  batchSummary,
  cardClass,
  finalCut,
  finalCutLoading,
  finalCutTask,
  onGenerateFinalCut,
  projectId,
}: FinalCutCardProps) {
  const finalCutVideoUrl =
    finalCut?.status === "ready" && finalCut.videoAssetPath
      ? getAssetUrl(projectId, finalCut.videoAssetPath, finalCut.updatedAt)
      : null;
  const generatingTask =
    finalCutTask?.status === "pending" || finalCutTask?.status === "running";

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-(--color-text-primary)">成片导出</h3>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            按 scene、segment、shot 固定顺序拼接当前批次全部已通过镜头，生成项目级 MP4。
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerateFinalCut}
          disabled={!allShotsApproved || generatingTask}
          className={getButtonClassName()}
        >
          {generatingTask ? "生成中..." : "生成成片"}
        </button>
      </div>

      {!allShotsApproved && (
        <p className="mt-3 text-sm text-(--color-text-muted)">
          需先审核通过全部镜头片段后才能生成成片。
        </p>
      )}

      {finalCutTask && (
        <div className="mt-4 grid gap-2 rounded-xl border border-(--color-border) bg-(--color-bg-base) p-4">
          <div>
            <p className={META_LABEL_CLASS}>成片任务状态</p>
            <p className={META_VALUE_CLASS}>{TASK_STATUS_LABELS[finalCutTask.status]}</p>
          </div>
          {finalCutTask.errorMessage && (
            <p className="text-sm text-(--color-danger)">{finalCutTask.errorMessage}</p>
          )}
        </div>
      )}

      {finalCutLoading && (
        <p className="mt-4 text-sm text-(--color-text-muted)">正在加载成片状态...</p>
      )}

      {finalCutVideoUrl && (
        <div className="mt-4 grid gap-4">
          <video
            data-testid="final-cut-player"
            controls
            preload="metadata"
            className="w-full rounded-xl border border-(--color-border) bg-black"
          >
            <source src={finalCutVideoUrl} type="video/mp4" />
          </video>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-(--color-bg-base) px-4 py-3">
            <div>
              <p className={META_LABEL_CLASS}>当前成片</p>
              <p className={META_VALUE_CLASS}>
                {finalCut?.shotCount ?? batchSummary.approvedShotCount} 个镜头，更新于{" "}
                {finalCut ? new Date(finalCut.updatedAt).toLocaleString("zh-CN") : "-"}
              </p>
            </div>
            <a
              href={finalCutVideoUrl}
              download
              className={getButtonClassName({ variant: "success" })}
            >
              下载 MP4
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
