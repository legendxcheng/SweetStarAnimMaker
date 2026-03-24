export interface GenerateShotImageInput {
  projectId: string;
  frameId: string;
  promptText: string;
  negativePromptText: string | null;
  referenceImagePaths: string[];
}

export interface GenerateShotImageResult {
  imageBytes: Uint8Array;
  rawResponse: string;
  provider: string;
  model: string;
  width: number | null;
  height: number | null;
}

export interface ShotImageProvider {
  generateShotImage(
    input: GenerateShotImageInput,
  ): Promise<GenerateShotImageResult> | GenerateShotImageResult;
}
