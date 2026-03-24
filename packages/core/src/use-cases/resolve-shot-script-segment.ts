import {
  matchesShotScriptSegmentSelector,
  parseShotScriptSegmentSelector,
  type ParsedShotScriptSegmentSelector,
} from "@sweet-star/shared";

export function resolveShotScriptSegment(
  segments: Array<{
    sceneId: string;
    segmentId: string;
  }>,
  selectorText: string,
) {
  const selector = parseShotScriptSegmentSelector(selectorText);
  const matches = segments.filter((segment) => matchesShotScriptSegmentSelector(segment, selector));

  if (matches.length === 0) {
    throw new Error(`Shot script segment not found: ${selectorText}`);
  }

  if (selector.sceneId === null && matches.length > 1) {
    throw new Error(`Ambiguous shot script segment selector: ${selector.segmentId}`);
  }

  return {
    selector,
    segment: matches[0]!,
  };
}

export function requireSceneId(
  selector: ParsedShotScriptSegmentSelector,
  fallbackSceneId: string,
) {
  return selector.sceneId ?? fallbackSceneId;
}
