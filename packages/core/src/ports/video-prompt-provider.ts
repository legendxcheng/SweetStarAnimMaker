import type { ShotFrameDependency } from "@sweet-star/shared";

export interface GenerateVideoPromptShotContext {
  id: string;
  shotCode: string;
  purpose: string;
  visual: string;
  subject: string;
  action: string;
  frameDependency: ShotFrameDependency;
  dialogue: string | null;
  os: string | null;
  audio: string | null;
  transitionHint: string | null;
  continuityNotes: string | null;
}

export interface GenerateVideoPromptFrameContext {
  imageAssetPath: string | null;
  width: number | null;
  height: number | null;
}

export interface GenerateVideoPromptInput {
  projectId: string;
  segment: {
    segmentId: string;
    sceneId: string;
    order: number;
    summary: string;
  };
  currentShot: GenerateVideoPromptShotContext;
  durationSec: number | null;
  startFrame: GenerateVideoPromptFrameContext;
  endFrame: GenerateVideoPromptFrameContext | null;
}

export interface GenerateVideoPromptResult {
  finalPrompt: string;
  dialoguePlan: string;
  audioPlan: string;
  visualGuardrails: string;
  rationale: string;
  rawResponse: string;
  provider: string;
  model: string;
}

export interface VideoPromptProvider {
  generateVideoPrompt(
    input: GenerateVideoPromptInput,
  ): Promise<GenerateVideoPromptResult> | GenerateVideoPromptResult;
}
