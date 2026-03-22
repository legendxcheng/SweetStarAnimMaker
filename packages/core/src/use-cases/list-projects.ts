import type { ProjectSummary } from "@sweet-star/shared";

import { toCurrentCharacterSheetBatchSummary } from "../domain/character-sheet";
import { toCurrentShotScriptSummary } from "../domain/shot-script";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { MasterPlotStorage, StoryboardStorage } from "../ports/storyboard-storage";
import { toCurrentStoryboardSummary } from "../domain/storyboard";
import { toProjectSummaryDto } from "./project-summary-dto";

export interface ListProjectsUseCase {
  execute(): Promise<ProjectSummary[]>;
}

export interface ListProjectsUseCaseDependencies {
  repository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
  storyboardStorage: StoryboardStorage;
  shotScriptStorage: ShotScriptStorage;
  characterSheetRepository: CharacterSheetRepository;
}

export function createListProjectsUseCase(
  dependencies: ListProjectsUseCaseDependencies,
): ListProjectsUseCase {
  return {
    async execute() {
      const projects = await dependencies.repository.listAll();

      const summaries = await Promise.all(
        projects.map(async (project) => {
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
          return toProjectSummaryDto(
            project,
            currentMasterPlot,
            currentCharacterSheetBatch,
            currentStoryboard ? toCurrentStoryboardSummary(currentStoryboard) : null,
            currentShotScript ? toCurrentShotScriptSummary(currentShotScript) : null,
          );
        }),
      );

      return summaries;
    },
  };
}
