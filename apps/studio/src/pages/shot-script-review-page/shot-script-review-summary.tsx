import type { ShotScriptSegment, ShotScriptReviewWorkspace } from "@sweet-star/shared";
import { toShotScriptSegmentSelector } from "@sweet-star/shared";

import { getSegmentReviewLabel } from "./constants";

type ShotScriptReviewSummaryProps = {
  workspace: ShotScriptReviewWorkspace;
  unapprovedSegments: ShotScriptSegment[];
  incompleteSegmentCount: number;
  failedSegmentCount: number;
};

export function ShotScriptReviewSummary({
  workspace,
  unapprovedSegments,
  incompleteSegmentCount,
  failedSegmentCount,
}: ShotScriptReviewSummaryProps) {
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-bg-surface) p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">标题</p>
          <p className="mt-1 text-sm font-medium text-(--color-text-primary)">
            {workspace.currentShotScript.title ?? "未命名"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
            Segment 数
          </p>
          <p className="mt-1 text-sm font-medium text-(--color-text-primary)">
            {workspace.currentShotScript.segmentCount}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">Shot 数</p>
          <p className="mt-1 text-sm font-medium text-(--color-text-primary)">
            {workspace.currentShotScript.shotCount}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
            更新时间
          </p>
          <p className="mt-1 text-sm font-medium text-(--color-text-primary)">
            {new Date(workspace.currentShotScript.updatedAt).toLocaleString("zh-CN")}
          </p>
        </div>
      </div>

      {unapprovedSegments.length > 0 && (
        <div className="mt-5 rounded-lg border border-(--color-warning)/30 bg-(--color-warning)/8 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-(--color-text-primary)">
                还有 {unapprovedSegments.length} 个段落未通过
              </p>
              <p className="mt-1 text-xs text-(--color-text-muted)">
                {failedSegmentCount > 0
                  ? `其中 ${failedSegmentCount} 个段落生成失败，请优先重生成或人工修正。`
                  : incompleteSegmentCount > 0
                    ? `其中 ${incompleteSegmentCount} 个段落未生成完成，全部通过按钮会继续隐藏。`
                  : "当前都已生成完成，但仍需逐段通过。"}
              </p>
            </div>
          </div>

          {workspace.latestTask?.status === "failed" && workspace.latestTask.errorMessage && (
            <div className="mt-3 rounded-lg border border-(--color-danger)/30 bg-(--color-danger)/8 px-3 py-2">
              <p className="text-xs font-semibold text-(--color-danger)">最近任务失败</p>
              <p className="mt-1 text-sm text-(--color-text-primary)">
                {workspace.latestTask.errorMessage}
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-col gap-2">
            {unapprovedSegments.map((segment) => (
              <div
                key={toShotScriptSegmentSelector(segment)}
                className="rounded-lg border border-(--color-border) bg-(--color-bg-surface) px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-(--color-text-primary)">
                    {segment.sceneId} / {segment.segmentId}
                  </p>
                  <span className="rounded-full bg-(--color-bg-base) px-2 py-0.5 text-xs font-medium text-(--color-text-muted)">
                    {getSegmentReviewLabel(segment)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-(--color-text-muted)">
                  {segment.name ?? segment.summary ?? segment.segmentId}
                </p>
                {segment.status === "failed" && segment.lastErrorMessage && (
                  <p className="mt-1 text-xs text-(--color-danger)">{segment.lastErrorMessage}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
