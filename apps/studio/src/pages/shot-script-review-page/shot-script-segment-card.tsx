import type {
  SaveShotScriptSegmentRequest,
  ShotScriptItem,
  ShotScriptSegment,
} from "@sweet-star/shared";

import { getButtonClassName } from "../../styles/button-styles";
import { getSegmentReviewLabel, inputClass, textareaClass } from "./constants";
import { ShotScriptShotCard } from "./shot-script-shot-card";

type UpdateSegmentField = <K extends keyof SaveShotScriptSegmentRequest>(
  field: K,
  value: SaveShotScriptSegmentRequest[K],
) => void;

type UpdateShotField = <K extends keyof ShotScriptItem>(
  shotIndex: number,
  field: K,
  value: ShotScriptItem[K],
) => void;

type ShotScriptSegmentCardProps = {
  segment: ShotScriptSegment;
  segmentStorageKey: string;
  draft: SaveShotScriptSegmentRequest;
  isDirty: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  canSave: boolean;
  canRegenerate: boolean;
  canApprove: boolean;
  onUpdateSegmentField: UpdateSegmentField;
  onUpdateShotField: UpdateShotField;
  onSave: () => void;
  onRegenerate: () => void;
  onApprove: () => void;
};

export function ShotScriptSegmentCard({
  segment,
  segmentStorageKey,
  draft,
  isDirty,
  isSaving,
  isSubmitting,
  canSave,
  canRegenerate,
  canApprove,
  onUpdateSegmentField,
  onUpdateShotField,
  onSave,
  onRegenerate,
  onApprove,
}: ShotScriptSegmentCardProps) {
  return (
    <section className="rounded-xl border border-(--color-border) bg-(--color-bg-surface) p-5">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
            Segment {segment.order}
          </p>
          <h2 className="mt-1 text-base font-semibold text-(--color-text-primary)">
            {segment.name ?? segment.segmentId}
          </h2>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            Scene {segment.sceneId} / Segment {segment.segmentId} / 当前状态 {getSegmentReviewLabel(segment)}
          </p>
          {segment.status === "failed" && segment.lastErrorMessage && (
            <p className="mt-2 text-sm text-(--color-danger)">{segment.lastErrorMessage}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && canSave && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className={getButtonClassName({ size: "compact" })}
            >
              {isSaving ? "保存中..." : "保存本段"}
            </button>
          )}
          {!isDirty && canRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isSubmitting}
              className={getButtonClassName({
                variant: "warning",
                size: "compact",
              })}
            >
              重生成本段
            </button>
          )}
          {!isDirty && canApprove && (
            <button
              onClick={onApprove}
              disabled={isSubmitting}
              className={getButtonClassName({
                variant: "success",
                size: "compact",
              })}
            >
              通过本段
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-5">
        <div>
          <label
            htmlFor={`segment-name-${segmentStorageKey}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            段落 {segment.order} 标题
          </label>
          <input
            id={`segment-name-${segmentStorageKey}`}
            value={draft.name ?? ""}
            onChange={(event) =>
              onUpdateSegmentField("name", event.target.value || null)
            }
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`segment-duration-${segmentStorageKey}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            段落 {segment.order} 时长（秒）
          </label>
          <input
            id={`segment-duration-${segmentStorageKey}`}
            type="number"
            value={draft.durationSec ?? ""}
            onChange={(event) =>
              onUpdateSegmentField(
                "durationSec",
                event.target.value ? Number(event.target.value) : null,
              )
            }
            className={inputClass}
          />
        </div>
        <div className="lg:col-span-2">
          <label
            htmlFor={`segment-summary-${segmentStorageKey}`}
            className="block text-sm font-medium text-(--color-text-primary) mb-1.5"
          >
            段落 {segment.order} 摘要
          </label>
          <textarea
            id={`segment-summary-${segmentStorageKey}`}
            value={draft.summary}
            onChange={(event) => onUpdateSegmentField("summary", event.target.value)}
            rows={3}
            className={textareaClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {draft.shots.map((shot, shotIndex) => (
          <ShotScriptShotCard
            key={shot.id}
            shot={shot}
            shotIndex={shotIndex}
            onUpdateShotField={onUpdateShotField}
          />
        ))}
      </div>
    </section>
  );
}
