export interface ShotScriptSegmentIdentity {
  sceneId: string;
  segmentId: string;
}

export interface ParsedShotScriptSegmentSelector {
  sceneId: string | null;
  segmentId: string;
}

export function toShotScriptSegmentSelector(identity: ShotScriptSegmentIdentity) {
  return `${identity.sceneId}:${identity.segmentId}`;
}

export function parseShotScriptSegmentSelector(
  selector: string,
): ParsedShotScriptSegmentSelector {
  const separatorIndex = selector.indexOf(":");

  if (separatorIndex === -1) {
    return {
      sceneId: null,
      segmentId: selector,
    };
  }

  return {
    sceneId: selector.slice(0, separatorIndex),
    segmentId: selector.slice(separatorIndex + 1),
  };
}

export function toShotScriptSegmentStorageKey(identity: ShotScriptSegmentIdentity) {
  return `${identity.sceneId}__${identity.segmentId}`;
}

export function matchesShotScriptSegmentSelector(
  segment: ShotScriptSegmentIdentity,
  selector: string | ParsedShotScriptSegmentSelector,
) {
  const parsed = typeof selector === "string" ? parseShotScriptSegmentSelector(selector) : selector;

  if (parsed.sceneId !== null) {
    return segment.sceneId === parsed.sceneId && segment.segmentId === parsed.segmentId;
  }

  return segment.segmentId === parsed.segmentId;
}
