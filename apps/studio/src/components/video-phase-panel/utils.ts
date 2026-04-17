import type { ShotVideoRecord } from "@sweet-star/shared";

import { config } from "../../services/config";

const shotHierarchyCollator = new Intl.Collator("zh-CN", {
  numeric: true,
  sensitivity: "base",
});

export function getAssetUrl(projectId: string, assetRelPath: string, updatedAt: string) {
  const url = new URL(config.projectAssetContentUrl(projectId, assetRelPath));
  url.searchParams.set("v", updatedAt);
  return url.toString();
}

export function sortShotsByHierarchy(shots: ShotVideoRecord[]) {
  return [...shots].sort((left, right) => {
    const sceneCompare = shotHierarchyCollator.compare(left.sceneId, right.sceneId);
    if (sceneCompare !== 0) {
      return sceneCompare;
    }

    const segmentCompare = shotHierarchyCollator.compare(left.segmentId, right.segmentId);
    if (segmentCompare !== 0) {
      return segmentCompare;
    }

    const shotCompare = shotHierarchyCollator.compare(left.shotId, right.shotId);
    if (shotCompare !== 0) {
      return shotCompare;
    }

    return shotHierarchyCollator.compare(left.shotCode, right.shotCode);
  });
}
