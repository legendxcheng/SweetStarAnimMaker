import type {
  SaveShotScriptSegmentRequest,
  ShotFrameDependency,
  ShotScriptSegment,
  ShotScriptReviewWorkspace,
} from "@sweet-star/shared";
import { toShotScriptSegmentSelector } from "@sweet-star/shared";

export const shotFrameDependencyOptions: Array<{
  value: ShotFrameDependency;
  label: string;
}> = [
  { value: "start_frame_only", label: "首帧即可" },
  { value: "start_and_end_frame", label: "需要首尾帧" },
];

export const inputClass =
  "w-full bg-(--color-bg-base) border border-(--color-border-muted) text-(--color-text-primary) rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20";

export const textareaClass = `${inputClass} resize-y`;

export function toSegmentDrafts(workspace: ShotScriptReviewWorkspace) {
  return Object.fromEntries(
    workspace.currentShotScript.segments.map((segment) => [
      toShotScriptSegmentSelector(segment),
      {
        name: segment.name,
        summary: segment.summary,
        durationSec: segment.durationSec,
        shots: segment.shots,
      } satisfies SaveShotScriptSegmentRequest,
    ]),
  ) as Record<string, SaveShotScriptSegmentRequest>;
}

export function getSegmentReviewLabel(segment: ShotScriptSegment) {
  if (segment.status === "approved") {
    return "已通过";
  }

  if (segment.status === "pending" || segment.status === "generating" || segment.shots.length === 0) {
    return "未生成完成";
  }

  return "待通过";
}
