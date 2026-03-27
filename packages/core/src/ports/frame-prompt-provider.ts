import type { ImageFrameType, ShotFrameDependency } from "@sweet-star/shared";

export interface GenerateFramePromptShotContext {
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

export interface GenerateFramePromptInput {
  projectId: string;
  frameType: ImageFrameType;
  segment: {
    segmentId: string;
    sceneId: string;
    order: number;
    summary: string;
    shots: Array<GenerateFramePromptShotContext>;
  };
  currentShot: GenerateFramePromptShotContext;
  characterRoster: Array<{
    characterId: string;
    characterName: string;
    promptTextCurrent: string;
    imageAssetPath: string | null;
  }>;
}

export interface GenerateFramePromptResult {
  frameType: ImageFrameType;
  selectedCharacterIds: string[];
  promptText: string;
  negativePromptText: string | null;
  rationale: string | null;
  rawResponse: string;
  provider: string;
  model: string;
}

export interface FramePromptProvider {
  generateFramePrompt(
    input: GenerateFramePromptInput,
  ): Promise<GenerateFramePromptResult> | GenerateFramePromptResult;
}
