import type { ShotScriptSegment } from "@sweet-star/shared";

export interface GenerateShotScriptSegmentInput {
  promptText: string;
  variables: Record<string, unknown>;
}

export interface GenerateShotScriptSegmentResult {
  rawResponse: string;
  segment: ShotScriptSegment;
}

export interface ShotScriptProvider {
  generateShotScriptSegment(
    input: GenerateShotScriptSegmentInput,
  ):
    | Promise<GenerateShotScriptSegmentResult>
    | GenerateShotScriptSegmentResult;
}
