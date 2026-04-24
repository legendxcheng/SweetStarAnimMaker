import {
  initialProjectStatus,
  type ProjectStatus,
  type VideoReferenceStrategy,
} from "@sweet-star/shared";

import { premiseRelPath } from "./project-premise";

export interface ProjectRecord {
  id: string;
  name: string;
  slug: string;
  storageDir: string;
  premiseRelPath: string;
  premiseBytes: number;
  currentMasterPlotId: string | null;
  currentCharacterSheetBatchId: string | null;
  currentSceneSheetBatchId: string | null;
  currentStoryboardId: string | null;
  currentShotScriptId: string | null;
  currentImageBatchId: string | null;
  currentVideoBatchId: string | null;
  videoReferenceStrategy: VideoReferenceStrategy;
  visualStyleText: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  premiseUpdatedAt: string;
}

export interface CreateProjectRecordInput {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  premiseUpdatedAt: string;
  premiseBytes?: number;
  visualStyleText?: string;
  currentMasterPlotId?: string | null;
  currentCharacterSheetBatchId?: string | null;
  currentSceneSheetBatchId?: string | null;
  currentStoryboardId?: string | null;
  currentShotScriptId?: string | null;
  currentImageBatchId?: string | null;
  currentVideoBatchId?: string | null;
  videoReferenceStrategy?: VideoReferenceStrategy;
  status?: ProjectStatus;
}

export function toProjectStorageDir(projectId: string, slug: string) {
  return `projects/${projectId}-${slug}`;
}

export function toProjectSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "project";
}

export function createProjectRecord(input: CreateProjectRecordInput): ProjectRecord {
  return {
    ...input,
    premiseBytes: input.premiseBytes ?? 0,
    currentMasterPlotId: input.currentMasterPlotId ?? null,
    currentCharacterSheetBatchId: input.currentCharacterSheetBatchId ?? null,
    currentSceneSheetBatchId: input.currentSceneSheetBatchId ?? null,
    currentStoryboardId: input.currentStoryboardId ?? null,
    currentShotScriptId: input.currentShotScriptId ?? null,
    currentImageBatchId: input.currentImageBatchId ?? null,
    currentVideoBatchId: input.currentVideoBatchId ?? null,
    videoReferenceStrategy: input.videoReferenceStrategy ?? "auto",
    visualStyleText: input.visualStyleText ?? "",
    status: input.status ?? initialProjectStatus,
    storageDir: toProjectStorageDir(input.id, input.slug),
    premiseRelPath: premiseRelPath,
  };
}
