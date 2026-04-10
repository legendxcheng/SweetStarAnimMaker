import type { ReferenceImageUploader } from "../image-upload/reference-image-uploader";

export interface CreateKlingOmniProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  modelName?: string;
  mode?: string;
  sound?: string;
  timeoutMs?: number;
  referenceImageUploader?: ReferenceImageUploader;
  fetchFn?: typeof fetch;
}

export interface CreateKlingOmniStageVideoProviderOptions extends CreateKlingOmniProviderOptions {
  durationSeconds?: number;
  aspectRatio?: KlingOmniAspectRatio;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}

export type KlingOmniAspectRatio = "16:9" | "9:16" | "1:1";

export interface SubmitOmniVideoWithFramesInput {
  promptText: string;
  startImage: string;
  endImage: string;
  durationSeconds?: number | null;
  aspectRatio?: KlingOmniAspectRatio | null;
  sound?: string | null;
  callbackUrl?: string | null;
  externalTaskId?: string | null;
}

export interface SubmitOmniVideoWithStartFrameInput {
  promptText: string;
  startImage: string;
  durationSeconds?: number | null;
  aspectRatio?: KlingOmniAspectRatio | null;
  sound?: string | null;
  callbackUrl?: string | null;
  externalTaskId?: string | null;
}

export interface SubmitOmniVideoWithElementsInput {
  promptText: string;
  elementIds: Array<string | number>;
  durationSeconds?: number | null;
  aspectRatio?: KlingOmniAspectRatio | null;
  sound?: string | null;
  callbackUrl?: string | null;
  externalTaskId?: string | null;
}

export interface SubmitOmniVideoResult {
  taskId: string;
  status: string | null;
  provider: string;
  modelName: string;
  mode: string;
  rawResponse: string;
}

export interface GetOmniVideoTaskInput {
  taskId: string;
}

export interface GetOmniVideoTaskResult {
  taskId: string;
  status: string | null;
  videoUrl: string | null;
  errorMessage: string | null;
  completed: boolean;
  failed: boolean;
  rawResponse: string;
}

export interface CreateElementInput {
  name: string;
  description: string;
  frontalImage: string;
  referenceImages: string[];
  voiceId?: string | null;
  tagIds?: string[] | null;
  callbackUrl?: string | null;
  externalTaskId?: string | null;
}

export interface CreateElementResult {
  taskId: string;
  status: string | null;
  provider: string;
  rawResponse: string;
}

export interface GetElementInput {
  taskId: string;
}

export interface GetElementResult {
  taskId: string;
  status: string | null;
  errorMessage: string | null;
  completed: boolean;
  failed: boolean;
  elementId: string | null;
  elementName: string | null;
  elementDescription: string | null;
  referenceType: string | null;
  elementStatus: string | null;
  rawResponse: string;
}

export interface ListElementsInput {
  pageNum?: number;
  pageSize?: number;
}

export interface ListElementsResult {
  items: GetElementResult[];
  rawResponse: string;
}

export interface KlingOmniProvider {
  submitOmniVideoWithStartFrame(
    input: SubmitOmniVideoWithStartFrameInput,
  ): Promise<SubmitOmniVideoResult> | SubmitOmniVideoResult;
  submitOmniVideoWithFrames(
    input: SubmitOmniVideoWithFramesInput,
  ): Promise<SubmitOmniVideoResult> | SubmitOmniVideoResult;
  submitOmniVideoWithElements(
    input: SubmitOmniVideoWithElementsInput,
  ): Promise<SubmitOmniVideoResult> | SubmitOmniVideoResult;
  getOmniVideoTask(
    input: GetOmniVideoTaskInput,
  ): Promise<GetOmniVideoTaskResult> | GetOmniVideoTaskResult;
  createElement(input: CreateElementInput): Promise<CreateElementResult> | CreateElementResult;
  getElement(input: GetElementInput): Promise<GetElementResult> | GetElementResult;
  listElements(input?: ListElementsInput): Promise<ListElementsResult> | ListElementsResult;
}

export interface KlingOmniRequestContext {
  apiToken: string;
  baseUrl: string;
  fetchFn: typeof fetch;
  timeoutMs?: number;
}

export interface KlingOmniRequestJsonInput extends KlingOmniRequestContext {
  method: "GET" | "POST";
  path: string;
  body?: Record<string, unknown>;
}

export interface OmniVideoImageInput {
  image_url: string;
  type: "first_frame" | "end_frame";
}

export interface SubmitOmniVideoRequestInput {
  modelName: string;
  mode: string;
  promptText: string;
  durationSeconds?: number | null;
  aspectRatio?: KlingOmniAspectRatio | null;
  sound?: string | null;
  callbackUrl?: string | null;
  externalTaskId?: string | null;
  imageList?: OmniVideoImageInput[];
}

export interface SubmitResultContext {
  provider: string;
  modelName: string;
  mode: string;
  missingIdMessage: string;
}

export interface NormalizedTaskState {
  taskId: string;
  status: string | null;
  errorMessage: string | null;
  completed: boolean;
  failed: boolean;
}
