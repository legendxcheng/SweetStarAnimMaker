import type { ProjectDetail } from "@sweet-star/shared";

import { toCurrentCharacterSheetBatchSummary } from "../domain/character-sheet";
import { ProjectNotFoundError } from "../errors/project-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { ProjectRepository } from "../ports/project-repository";
import type { MasterPlotStorage, StoryboardStorage } from "../ports/storyboard-storage";
import { toCurrentStoryboardSummary } from "../domain/storyboard";
import { toProjectDetailDto } from "./project-detail-dto";

export interface GetProjectDetailInput {
  projectId: string;
}

export interface GetProjectDetailUseCase {
  execute(input: GetProjectDetailInput): Promise<ProjectDetail>;
}

export interface GetProjectDetailUseCaseDependencies {
  repository: ProjectRepository;
  masterPlotStorage: MasterPlotStorage;
  storyboardStorage: StoryboardStorage;
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
      const currentCharacterSheetBatch = project.currentCharacterSheetBatchId
        ? await dependencies.characterSheetRepository
            .findBatchById(project.currentCharacterSheetBatchId)
            .then(async (batch) => {
              if (!batch) {
                return null;
              }

              const characters = await dependencies.characterSheetRepository.listCharactersByBatchId(
                batch.id,
              );

              return toCurrentCharacterSheetBatchSummary(batch, characters);
            })
        : null;

      return toProjectDetailDto(
        project,
        currentMasterPlot,
        currentCharacterSheetBatch,
        currentStoryboard ? toCurrentStoryboardSummary(currentStoryboard) : null,
      );
    },
  };
}
