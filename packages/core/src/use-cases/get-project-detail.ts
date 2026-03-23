import type { ProjectDetail } from "@sweet-star/shared";

import { toCurrentCharacterSheetBatchSummary } from "../domain/character-sheet";
import { toCurrentShotScriptSummary } from "../domain/shot-script";
import { toCurrentStoryboardSummary } from "../domain/storyboard";
import { ProjectNotFoundError } from "../errors/project-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { PremiseStorage } from "../ports/script-storage";
import type { MasterPlotStorage, StoryboardStorage } from "../ports/storyboard-storage";
import { toProjectDetailDto } from "./project-detail-dto";

export interface GetProjectDetailInput {
  projectId: string;
}

export interface GetProjectDetailUseCase {
  execute(input: GetProjectDetailInput): Promise<ProjectDetail>;
}

export interface GetProjectDetailUseCaseDependencies {
  repository: ProjectRepository;
  premiseStorage: PremiseStorage;
  masterPlotStorage: MasterPlotStorage;
  storyboardStorage: StoryboardStorage;
  shotScriptStorage: ShotScriptStorage;
  characterSheetRepository: CharacterSheetRepository;
}

export function createGetProjectDetailUseCase(
  dependencies: GetProjectDetailUseCaseDependencies,
): GetProjectDetailUseCase {
  return {
    async execute(input) {
      const project = await dependencies.repository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const premiseText = await dependencies.premiseStorage.readPremise({
        storageDir: project.storageDir,
      });
      const currentMasterPlot = project.currentMasterPlotId
        ? await dependencies.masterPlotStorage.readCurrentMasterPlot({
            storageDir: project.storageDir,
          })
        : null;
      const currentStoryboard = project.currentStoryboardId
        ? await dependencies.storyboardStorage.readCurrentStoryboard({
            storageDir: project.storageDir,
          })
        : null;
      const currentShotScript = project.currentShotScriptId
        ? await dependencies.shotScriptStorage.readCurrentShotScript({
            storageDir: project.storageDir,
          })
        : null;
      let currentCharacterSheetBatch = null;

      if (project.currentCharacterSheetBatchId) {
        const batch = await dependencies.characterSheetRepository.findBatchById(
          project.currentCharacterSheetBatchId,
        );

        if (batch) {
          const characters = await dependencies.characterSheetRepository.listCharactersByBatchId(
            batch.id,
          );
          currentCharacterSheetBatch = toCurrentCharacterSheetBatchSummary(batch, characters);
        }
      }

      return toProjectDetailDto(
        project,
        currentMasterPlot,
        currentCharacterSheetBatch,
        currentStoryboard ? toCurrentStoryboardSummary(currentStoryboard) : null,
        premiseText,
        currentShotScript ? toCurrentShotScriptSummary(currentShotScript) : null,
      );
    },
  };
}
