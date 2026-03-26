import type { ProjectDetail } from "@sweet-star/shared";

import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { PremiseStorage } from "../ports/script-storage";
import type { MasterPlotStorage } from "../ports/storyboard-storage";
import { toProjectDetailDto } from "./project-detail-dto";

export interface ResetProjectPremiseInput {
  projectId: string;
  premiseText: string;
  visualStyleText?: string;
  confirmReset: true;
}

export interface ResetProjectPremiseUseCase {
  execute(input: ResetProjectPremiseInput): Promise<ProjectDetail>;
}

export interface ResetProjectPremiseUseCaseDependencies {
  repository: ProjectRepository;
  premiseStorage: PremiseStorage;
  masterPlotStorage: MasterPlotStorage;
  clock: Clock;
}

export function createResetProjectPremiseUseCase(
  dependencies: ResetProjectPremiseUseCaseDependencies,
): ResetProjectPremiseUseCase {
  return {
    async execute(input) {
      if (input.confirmReset !== true) {
        throw new ProjectValidationError("Reset confirmation is required");
      }

      const premiseText = requireNonEmptyText(input.premiseText, "Premise is required");
      const visualStyleText = normalizeOptionalText(input.visualStyleText);
      const project = await dependencies.repository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (!dependencies.repository.resetToPremise) {
        throw new Error("Project repository does not support resetToPremise");
      }

      const timestamp = dependencies.clock.now();
      const premiseBytes = Buffer.byteLength(premiseText, "utf8");

      await dependencies.repository.resetToPremise({
        projectId: project.id,
        premiseBytes,
        visualStyleText,
        updatedAt: timestamp,
        premiseUpdatedAt: timestamp,
      });
      await dependencies.premiseStorage.deletePremise({
        storageDir: project.storageDir,
      });
      await dependencies.premiseStorage.writePremise({
        storageDir: project.storageDir,
        premiseText,
      });
      await dependencies.masterPlotStorage.initializePromptTemplate({
        storageDir: project.storageDir,
        promptTemplateKey: "master_plot.generate",
      });

      return toProjectDetailDto(
        {
          ...project,
          premiseBytes,
          updatedAt: timestamp,
          premiseUpdatedAt: timestamp,
          currentMasterPlotId: null,
          currentCharacterSheetBatchId: null,
          currentStoryboardId: null,
          currentShotScriptId: null,
          currentImageBatchId: null,
          currentVideoBatchId: null,
          visualStyleText,
          status: "premise_ready",
        },
        null,
        null,
        null,
        premiseText,
        visualStyleText,
        null,
        null,
        null,
      );
    },
  };
}

function requireNonEmptyText(value: string, message: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new ProjectValidationError(message);
  }

  return trimmed;
}

function normalizeOptionalText(value: string | undefined) {
  return value?.trim() ?? "";
}
