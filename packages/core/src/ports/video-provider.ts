export interface GenerateSegmentVideoInput {
  projectId: string;
  sceneId: string;
  segmentId: string;
  shotId: string;
  shotCode: string;
  frameDependency: "start_frame_only" | "start_and_end_frame";
  promptText: string;
  startFramePath: string;
  endFramePath?: string;
  durationSec?: number | null;
  model?: string | null;
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
