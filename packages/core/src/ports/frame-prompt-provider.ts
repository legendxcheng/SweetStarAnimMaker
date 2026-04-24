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

export interface GenerateFramePromptSceneContext {
  source: "scene_sheet" | "shot_script";
  sceneId: string | null;
  sceneName: string | null;
  scenePurpose: string | null;
  promptTextCurrent: string | null;
  constraintsText: string | null;
  imageAssetPath: string | null;
  environmentSummary: string;
}

export interface GenerateFramePromptSceneCandidate {
  sceneId: string;
  sceneName: string;
  scenePurpose: string;
  promptTextCurrent: string;
  constraintsText: string;
  imageAssetPath: string | null;
  environmentSummary: string;
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
  startFrameContext?: {
    promptTextCurrent: string;
    selectedCharacterIds: string[];
    imageStatus: "pending" | "generating" | "in_review" | "approved" | "failed";
    imageAssetPath: string | null;
  };
  characterRoster: Array<{
    characterId: string;
    characterName: string;
    promptTextCurrent: string;
    imageAssetPath: string | null;
  }>;
  sceneCandidates: GenerateFramePromptSceneCandidate[];
  sceneContext?: GenerateFramePromptSceneContext;
}

export interface GenerateFramePromptResult {
  frameType: ImageFrameType;
  selectedCharacterIds: string[];
  selectedSceneId: string | null;
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
