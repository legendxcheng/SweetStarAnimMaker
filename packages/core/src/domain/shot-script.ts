import type {
  CurrentShotScript,
  CurrentShotScriptSummary,
} from "@sweet-star/shared";

export const shotScriptDirectoryName = "shot-script";
export const shotScriptVersionsDirectoryName = "versions";
export const currentShotScriptJsonFileName = "current.json";
export const currentShotScriptMarkdownFileName = "current.md";
export const currentShotScriptJsonRelPath =
  `${shotScriptDirectoryName}/${currentShotScriptJsonFileName}`;
export const currentShotScriptMarkdownRelPath =
  `${shotScriptDirectoryName}/${currentShotScriptMarkdownFileName}`;

export function toCurrentShotScriptSummary(
  shotScript: CurrentShotScript,
): CurrentShotScriptSummary {
  const durations = shotScript.shots
    .map((shot) => shot.durationSec)
    .filter((duration): duration is number => typeof duration === "number");

  return {
    id: shotScript.id,
    title: shotScript.title,
    sourceStoryboardId: shotScript.sourceStoryboardId,
    sourceTaskId: shotScript.sourceTaskId,
    updatedAt: shotScript.updatedAt,
    approvedAt: shotScript.approvedAt,
    shotCount: shotScript.shots.length,
    totalDurationSec:
      durations.length > 0
        ? durations.reduce((total, duration) => total + duration, 0)
        : null,
  };
}
