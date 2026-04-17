import type { ProjectDetail, TaskDetail } from "@sweet-star/shared";

export interface CharacterSheetsPhasePanelProps {
  project: ProjectDetail;
  task: TaskDetail | null;
  taskError: Error | null;
  creatingTask: boolean;
  disableGenerate: boolean;
  onGenerate: () => void;
  onProjectRefresh?: () => void | Promise<void>;
}

export type CharacterSheetsPhaseActionBusy =
  | "save"
  | "upload"
  | "delete"
  | "regenerate"
  | "approve"
  | null;
