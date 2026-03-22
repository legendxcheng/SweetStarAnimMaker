import type { CharacterSheetListResponse } from "@sweet-star/shared";

import {
  toCurrentCharacterSheetBatchSummary,
} from "../domain/character-sheet";
import { CurrentCharacterSheetBatchNotFoundError } from "../errors/character-sheet-errors";
import { ProjectNotFoundError } from "../errors/project-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { CharacterSheetStorage } from "../ports/character-sheet-storage";
import type { ProjectRepository } from "../ports/project-repository";

export interface ListCharacterSheetsInput {
  projectId: string;
}

export interface ListCharacterSheetsUseCase {
  execute(input: ListCharacterSheetsInput): Promise<CharacterSheetListResponse>;
}

export interface ListCharacterSheetsUseCaseDependencies {
  projectRepository: ProjectRepository;
  characterSheetRepository: CharacterSheetRepository;
  characterSheetStorage: CharacterSheetStorage;
}

export function createListCharacterSheetsUseCase(
  dependencies: ListCharacterSheetsUseCaseDependencies,
): ListCharacterSheetsUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      if (!project.currentCharacterSheetBatchId) {
        throw new CurrentCharacterSheetBatchNotFoundError(project.id);
      }

      const batch = await dependencies.characterSheetRepository.findBatchById(
        project.currentCharacterSheetBatchId,
      );

      if (!batch) {
        throw new CurrentCharacterSheetBatchNotFoundError(project.id);
      }

      const characters = await dependencies.characterSheetRepository.listCharactersByBatchId(
        batch.id,
      );
      const charactersWithReferenceImages = await Promise.all(
        characters.map(async (character) => ({
          ...character,
          referenceImages: await dependencies.characterSheetStorage.listReferenceImages({
            character,
          }),
        })),
      );

      return {
        currentBatch: toCurrentCharacterSheetBatchSummary(batch, charactersWithReferenceImages),
        characters: charactersWithReferenceImages,
      };
    },
  };
}
