import type { SegmentVideoRecord } from "@sweet-star/shared";

import { config } from "../../services/config";

const segmentHierarchyCollator = new Intl.Collator("zh-CN", {
  numeric: true,
  sensitivity: "base",
});

export function getAssetUrl(projectId: string, assetRelPath: string, updatedAt: string) {
  const url = new URL(config.projectAssetContentUrl(projectId, assetRelPath));
  url.searchParams.set("v", updatedAt);
  return url.toString();
}

export function sortSegmentsByHierarchy(segments: SegmentVideoRecord[]) {
  return [...segments].sort((left, right) => {
    const orderCompare = left.segmentOrder - right.segmentOrder;
    if (orderCompare !== 0) {
      return orderCompare;
    }

    const sceneCompare = segmentHierarchyCollator.compare(left.sceneId, right.sceneId);
    if (sceneCompare !== 0) {
      return sceneCompare;
    }

    const segmentCompare = segmentHierarchyCollator.compare(left.segmentId, right.segmentId);
    if (segmentCompare !== 0) {
      return segmentCompare;
    }

    return segmentHierarchyCollator.compare(left.id, right.id);
  });
}
