import type { ShotScriptSegment } from "@sweet-star/shared";

export interface GenerateShotScriptSegmentInput {
  promptText: string;
  variables: Record<string, unknown>;
}

export interface GenerateShotScriptSegmentResult {
  rawResponse: string;
  segment: ShotScriptSegment;
}

export interface GenerateShotScriptInput {
  promptText: string;
  variables: Record<string, unknown>;
}

export interface GenerateShotScriptResult {
  rawResponse: string;
  shotScript: Record<string, unknown>;
}

export interface ShotScriptProvider {
  generateShotScript?(
    input: GenerateShotScriptInput,
  ): Promise<GenerateShotScriptResult> | GenerateShotScriptResult;
  generateShotScriptSegment(
    input: GenerateShotScriptSegmentInput,
  ):
    | Promise<GenerateShotScriptSegmentResult>
    | GenerateShotScriptSegmentResult;
}
