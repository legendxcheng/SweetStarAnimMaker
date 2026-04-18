export interface GenerateSegmentVideoReferenceImageInput {
  assetPath: string;
  label?: string | null;
  order: number;
}

export interface GenerateSegmentVideoReferenceAudioInput {
  assetPath: string;
  label?: string | null;
  order: number;
}

export interface GenerateSegmentVideoInput {
  projectId: string;
  sceneId: string;
  segmentId: string;
  promptText: string;
  referenceImages?: GenerateSegmentVideoReferenceImageInput[];
  referenceAudios?: GenerateSegmentVideoReferenceAudioInput[];
  durationSec?: number | null;
  aspectRatio?: string | null;
  model?: string | null;
  // Deprecated shot-first fields retained for compatibility with older providers.
  shotId?: string;
  shotCode?: string;
  frameDependency?: "start_frame_only" | "start_and_end_frame";
  startFramePath?: string;
  endFramePath?: string;
}

export interface GenerateSegmentVideoResult {
  provider: string;
  model: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  rawResponse: string;
  durationSec: number | null;
}

export interface VideoProvider {
  generateSegmentVideo(
    input: GenerateSegmentVideoInput,
  ): Promise<GenerateSegmentVideoResult> | GenerateSegmentVideoResult;
}
