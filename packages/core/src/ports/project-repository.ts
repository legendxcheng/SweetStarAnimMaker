import type { ProjectStatus } from "@sweet-star/shared";

import type { ProjectRecord } from "../domain/project";

export interface UpdateProjectPremiseMetadataInput {
  id: string;
  premiseBytes: number;
  updatedAt: string;
  premiseUpdatedAt: string;
}

export interface UpdateCurrentMasterPlotInput {
  projectId: string;
  masterPlotId: string | null;
}

export interface UpdateCurrentCharacterSheetBatchInput {
  projectId: string;
  batchId: string | null;
}

export interface UpdateCurrentStoryboardInput {
  projectId: string;
  storyboardId: string | null;
}

export interface UpdateCurrentShotScriptInput {
  projectId: string;
  shotScriptId: string | null;
}

export interface UpdateCurrentImageBatchInput {
  projectId: string;
  batchId: string | null;
}

export interface UpdateCurrentVideoBatchInput {
  projectId: string;
  batchId: string | null;
}

export interface UpdateProjectStatusInput {
  projectId: string;
  status: ProjectStatus;
  updatedAt: string;
}

export interface ProjectRepository {
  insert(project: ProjectRecord): Promise<void> | void;
  findById(projectId: string): Promise<ProjectRecord | null> | ProjectRecord | null;
  listAll(): Promise<ProjectRecord[]> | ProjectRecord[];
  updatePremiseMetadata(
    input: UpdateProjectPremiseMetadataInput,
  ): Promise<void> | void;
  updateCurrentMasterPlot(
    input: UpdateCurrentMasterPlotInput,
  ): Promise<void> | void;
  updateCurrentCharacterSheetBatch(
    input: UpdateCurrentCharacterSheetBatchInput,
  ): Promise<void> | void;
  updateCurrentStoryboard(
    input: UpdateCurrentStoryboardInput,
  ): Promise<void> | void;
  updateCurrentShotScript(
    input: UpdateCurrentShotScriptInput,
  ): Promise<void> | void;
  updateCurrentImageBatch(
    input: UpdateCurrentImageBatchInput,
  ): Promise<void> | void;
  updateCurrentVideoBatch?(
    input: UpdateCurrentVideoBatchInput,
  ): Promise<void> | void;
  updateStatus(input: UpdateProjectStatusInput): Promise<void> | void;
}
