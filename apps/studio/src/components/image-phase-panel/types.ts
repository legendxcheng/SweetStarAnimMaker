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

export type ImagePhaseActionKind =
  | "save"
  | "regenerate"
  | "regenerate-all-prompts"
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
  frame: ShotReferenceFrame | null;
  draft: FrameDraftState | undefined;
  busy: boolean;
  metaLabelClass: string;
  metaValueClass: string;
  onDraftChange: (frameId: string, nextDraft: FrameDraftState) => void;
  onSavePrompt: (frame: ShotReferenceFrame) => Promise<void>;
  onRegeneratePrompt: (frame: ShotReferenceFrame) => Promise<void>;
  onGenerateFrame: (frame: ShotReferenceFrame) => Promise<void>;
}

export interface SegmentShotGroup {
  segmentId: string;
  sceneId: string;
  order: number;
  shots: ShotReferenceRecord[];
}
