import type {
  ProjectDetail,
  ShotReferenceFrame,
  ShotReferenceRecord,
  TaskDetail,
} from "@sweet-star/shared";

export interface ImagePhasePanelProps {
  project: ProjectDetail;
  task: TaskDetail | null;
  taskError: Error | null;
  creatingTask: boolean;
  disableGenerate: boolean;
  onGenerate: () => void;
  onProjectRefresh?: () => void | Promise<void>;
}

export interface FrameDraftState {
  promptTextCurrent: string;
  negativePromptTextCurrent: string;
}

export type FrameDraftMap = Record<string, FrameDraftState>;

export type ImageBatchSummary = NonNullable<ProjectDetail["currentImageBatch"]>;

export interface ImageGenerationStatusSummary {
  summary: string;
  detail: string | null;
}

export type ImagePhaseActionKind =
  | "save"
  | "regenerate"
  | "regenerate-all-prompts"
  | "regenerate-failed-prompts"
  | "regenerate-remaining-frames"
  | "generate-all-frames"
  | "generate"
  | "approve"
  | "approve-all";

export interface ImagePhaseActionBusy {
  kind: ImagePhaseActionKind;
  frameId?: string;
  shotId?: string;
}

export interface FrameEditorCardProps {
  projectId: string;
  visualStyleText: string;
  frame: ShotReferenceFrame | null;
  draft: FrameDraftState | undefined;
  busy: boolean;
  generationBlocked: boolean;
  generationBlockedMessage?: string;
  metaLabelClass: string;
  metaValueClass: string;
  onDraftChange: (frameId: string, nextDraft: FrameDraftState) => void;
  onSavePrompt: (frame: ShotReferenceFrame) => Promise<void>;
  onRegeneratePrompt: (frame: ShotReferenceFrame) => Promise<void>;
  onGenerateFrame: (frame: ShotReferenceFrame) => Promise<void>;
}

export interface ImageSegmentGroup {
  segmentId: string;
  sceneId: string;
  segmentOrder?: number;
  segment: ShotReferenceRecord;
}
