import type { ProjectDetail, SegmentFrameRecord, TaskDetail } from "@sweet-star/shared";

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

export type ImagePhaseActionKind =
  | "save"
  | "regenerate"
  | "regenerate-all-prompts"
  | "generate"
  | "approve"
  | "approve-all";

export interface ImagePhaseActionBusy {
  kind: ImagePhaseActionKind;
  frameId?: string;
}

export interface FrameEditorCardProps {
  projectId: string;
  frame: SegmentFrameRecord | null;
  draft: FrameDraftState | undefined;
  actionBusy: ImagePhaseActionBusy | null;
  metaLabelClass: string;
  metaValueClass: string;
  onDraftChange: (frameId: string, nextDraft: FrameDraftState) => void;
  onSavePrompt: (frame: SegmentFrameRecord) => Promise<void>;
  onRegeneratePrompt: (frame: SegmentFrameRecord) => Promise<void>;
  onGenerateFrame: (frame: SegmentFrameRecord) => Promise<void>;
  onApproveFrame: (frame: SegmentFrameRecord) => Promise<void>;
}
