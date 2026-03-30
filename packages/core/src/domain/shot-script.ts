import type {
  CurrentShotScript,
  CurrentShotScriptSummary,
  ShotScriptItem,
  ShotScriptSegment,
} from "@sweet-star/shared";

import type { ShotScriptGenerateTaskInput, ShotScriptSegmentSnapshot } from "./task";

export const shotScriptDirectoryName = "shot-script";
export const shotScriptVersionsDirectoryName = "versions";
export const currentShotScriptJsonFileName = "current.json";
export const currentShotScriptMarkdownFileName = "current.md";
export const currentShotScriptJsonRelPath =
  `${shotScriptDirectoryName}/${currentShotScriptJsonFileName}`;
export const currentShotScriptMarkdownRelPath =
  `${shotScriptDirectoryName}/${currentShotScriptMarkdownFileName}`;

export function createShotScriptShell(
  input: Pick<
    ShotScriptGenerateTaskInput,
    "sourceStoryboardId" | "storyboard"
  > & {
    id: string;
    sourceTaskId: string;
    updatedAt: string;
    currentShotScript?: CurrentShotScript | null;
  },
): CurrentShotScript {
  const approvedSegments = new Map(
    (input.currentShotScript?.segments ?? [])
      .filter((segment) => segment.status === "approved")
      .map((segment) => [`${segment.sceneId}:${segment.segmentId}`, segment] as const),
  );
  const segments = input.storyboard.scenes.flatMap((scene) =>
    scene.segments.map((segment) => {
      const approvedSegment = approvedSegments.get(`${scene.id}:${segment.id}`);
      return approvedSegment ?? createPendingShotScriptSegment(scene.id, segment);
    }),
  );
  const summary = summarizeShotScriptSegments(segments);

  return {
    id: input.id,
    title: input.storyboard.title ?? input.storyboard.episodeTitle,
    sourceStoryboardId: input.sourceStoryboardId,
    sourceTaskId: input.sourceTaskId,
    updatedAt: input.updatedAt,
    approvedAt: segments.length > 0 && segments.every((segment) => segment.status === "approved")
      ? input.updatedAt
      : null,
    segmentCount: segments.length,
    shotCount: summary.shotCount,
    totalDurationSec: summary.totalDurationSec,
    segments,
  };
}

export function createPendingShotScriptSegment(
  sceneId: string,
  segment: ShotScriptSegmentSnapshot,
): ShotScriptSegment {
  return {
    segmentId: segment.id,
    sceneId,
    order: segment.order,
    name: null,
    summary: segment.purpose,
    durationSec: segment.durationSec,
    status: "pending",
    lastGeneratedAt: null,
    approvedAt: null,
    shots: [],
  };
}

export function mergeShotScriptSegment(
  shotScript: CurrentShotScript,
  updatedSegment: ShotScriptSegment,
  updatedAt: string,
): CurrentShotScript {
  const segments = shotScript.segments.map((segment) =>
    segment.sceneId === updatedSegment.sceneId && segment.segmentId === updatedSegment.segmentId
      ? updatedSegment
      : segment,
  );
  const summary = summarizeShotScriptSegments(segments);

  return {
    ...shotScript,
    updatedAt,
    approvedAt: segments.every((segment) => segment.status === "approved") ? updatedAt : null,
    segmentCount: segments.length,
    shotCount: summary.shotCount,
    totalDurationSec: summary.totalDurationSec,
    segments,
  };
}

export function toInReviewShotScriptSegment(input: {
  baseSegment: ShotScriptSegment;
  shots: ShotScriptItem[];
  updatedAt: string;
  name?: string | null;
  summary?: string;
}): ShotScriptSegment {
  return {
    ...input.baseSegment,
    name: input.name ?? input.baseSegment.name,
    summary: input.summary ?? input.baseSegment.summary,
    status: "in_review",
    lastGeneratedAt: input.updatedAt,
    approvedAt: null,
    shots: input.shots,
  };
}

export function toEditedShotScriptSegment(input: {
  baseSegment: ShotScriptSegment;
  name: string | null;
  summary: string;
  durationSec: number | null;
  shots: ShotScriptItem[];
}): ShotScriptSegment {
  return {
    ...input.baseSegment,
    name: input.name,
    summary: input.summary,
    durationSec: input.durationSec,
    status: "in_review",
    approvedAt: null,
    shots: input.shots,
  };
}

export function toApprovedShotScriptSegment(
  segment: ShotScriptSegment,
  approvedAt: string,
): ShotScriptSegment {
  return {
    ...segment,
    status: "approved",
    approvedAt,
  };
}

export function toCurrentShotScriptSummary(
  shotScript: CurrentShotScript,
): CurrentShotScriptSummary {
  return toNormalizedCurrentShotScript(shotScript);
}

export function toNormalizedCurrentShotScript(
  shotScript: CurrentShotScript,
): CurrentShotScript {
  const segments = readShotScriptSegments(shotScript);
  const summary = summarizeShotScriptSegments(segments);

  return {
    id: shotScript.id,
    title: shotScript.title,
    sourceStoryboardId: shotScript.sourceStoryboardId,
    sourceTaskId: shotScript.sourceTaskId,
    updatedAt: shotScript.updatedAt,
    approvedAt: shotScript.approvedAt,
    segmentCount: segments.length,
    shotCount: summary.shotCount,
    totalDurationSec: summary.totalDurationSec,
    segments,
  };
}

function summarizeShotScriptSegments(segments: ShotScriptSegment[]) {
  const shots = segments.flatMap((segment) => segment.shots);
  const durations = shots
    .map((shot) => shot.durationSec)
    .filter((duration): duration is number => typeof duration === "number");

  return {
    shotCount: shots.length,
    totalDurationSec:
      durations.length > 0
        ? durations.reduce((total, duration) => total + duration, 0)
        : null,
  };
}

function readShotScriptSegments(shotScript: CurrentShotScript) {
  const current = shotScript as CurrentShotScript & {
    shots?: ShotScriptItem[];
  };

  if (Array.isArray(current.segments)) {
    return current.segments;
  }

  if (!Array.isArray(current.shots)) {
    return [];
  }

  return [
    {
      segmentId: current.shots[0]?.segmentId ?? "legacy_segment",
      sceneId: current.shots[0]?.sceneId ?? "legacy_scene",
      order: 1,
      name: null,
      summary: "legacy shot script",
      durationSec: null,
      status: current.approvedAt ? ("approved" as const) : ("in_review" as const),
      lastGeneratedAt: current.updatedAt,
      approvedAt: current.approvedAt,
      shots: current.shots,
    },
  ];
}
