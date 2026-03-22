import type { CharacterSheetReferenceImageContent } from "../ports/character-sheet-storage";

import {
  CharacterReferenceImageNotFoundError,
  CharacterSheetNotFoundError,
} from "../errors/character-sheet-errors";
import { ProjectNotFoundError } from "../errors/project-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { CharacterSheetStorage } from "../ports/character-sheet-storage";
import type { ProjectRepository } from "../ports/project-repository";

export interface GetCharacterSheetReferenceImageContentInput {
  projectId: string;
  characterId: string;
  referenceImageId: string;
}

export interface GetCharacterSheetReferenceImageContentUseCase {
  execute(
    input: GetCharacterSheetReferenceImageContentInput,
  ): Promise<CharacterSheetReferenceImageContent>;
}

export interface GetCharacterSheetReferenceImageContentUseCaseDependencies {
  projectRepository: ProjectRepository;
  characterSheetRepository: CharacterSheetRepository;
  characterSheetStorage: CharacterSheetStorage;
}

export function createGetCharacterSheetReferenceImageContentUseCase(
  dependencies: GetCharacterSheetReferenceImageContentUseCaseDependencies,
): GetCharacterSheetReferenceImageContentUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const character = await dependencies.characterSheetRepository.findCharacterById(
        input.characterId,
      );

      if (!character || character.projectId !== project.id) {
        throw new CharacterSheetNotFoundError(input.characterId);
      }

      const content = await dependencies.characterSheetStorage.getReferenceImageContent({
        character,
        referenceImageId: input.referenceImageId,
      });

      if (!content) {
        throw new CharacterReferenceImageNotFoundError(input.referenceImageId);
      }

      return content;
    },
  };
}
