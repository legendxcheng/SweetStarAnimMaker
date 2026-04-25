import type { ShotFrameDependency } from "@sweet-star/shared";

export interface GenerateVideoPromptSegmentContext {
  segmentId: string;
  sceneId: string;
  order: number;
  name?: string | null;
  summary: string;
  durationSec?: number | null;
  shotCount?: number;
}

export interface GenerateVideoPromptShotContext {
  id: string;
  shotCode: string;
  purpose: string;
  visual: string;
  subject: string;
  action: string;
  frameDependency: ShotFrameDependency;
  durationSec?: number | null;
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

export interface GenerateVideoPromptReferenceImageContext {
  id: string;
  assetPath: string;
  source: "auto" | "manual";
  order: number;
  sourceShotId?: string | null;
  label?: string | null;
}

export interface GenerateVideoPromptReferenceAudioContext {
  id: string;
  assetPath: string;
  source: "manual";
  order: number;
  label?: string | null;
  durationSec?: number | null;
}

export interface GenerateVideoPromptCharacterCandidateContext {
  id: string;
  characterName: string;
  promptTextCurrent: string;
  imageAssetPath: string;
}

export interface GenerateVideoPromptSceneCandidateContext {
  id: string;
  sceneName: string;
  scenePurpose: string;
  promptTextCurrent: string;
  constraintsText: string | null;
  imageAssetPath: string;
}

export interface GenerateVideoPromptInput {
  projectId: string;
  segment: GenerateVideoPromptSegmentContext;
  shots?: GenerateVideoPromptShotContext[];
  referenceImages?: GenerateVideoPromptReferenceImageContext[];
  referenceAudios?: GenerateVideoPromptReferenceAudioContext[];
  characterCandidates?: GenerateVideoPromptCharacterCandidateContext[];
  sceneCandidates?: GenerateVideoPromptSceneCandidateContext[];
  currentShot?: GenerateVideoPromptShotContext;
  durationSec?: number | null;
  startFrame?: GenerateVideoPromptFrameContext;
  endFrame?: GenerateVideoPromptFrameContext | null;
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
  selectedCharacterIds?: string[];
  selectedSceneId?: string | null;
}

export interface VideoPromptProvider {
  generateVideoPrompt(
    input: GenerateVideoPromptInput,
  ): Promise<GenerateVideoPromptResult> | GenerateVideoPromptResult;
}
