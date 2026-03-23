import type { CharacterSheetReferenceImageContent } from "../ports/character-sheet-storage";

import {
  CharacterSheetImageNotFoundError,
  CharacterSheetNotFoundError,
} from "../errors/character-sheet-errors";
import { ProjectNotFoundError } from "../errors/project-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { CharacterSheetStorage } from "../ports/character-sheet-storage";
import type { ProjectRepository } from "../ports/project-repository";

export interface GetCharacterSheetImageContentInput {
  projectId: string;
  characterId: string;
}

export interface GetCharacterSheetImageContentUseCase {
  execute(input: GetCharacterSheetImageContentInput): Promise<CharacterSheetReferenceImageContent>;
}

export interface GetCharacterSheetImageContentUseCaseDependencies {
  projectRepository: ProjectRepository;
  characterSheetRepository: CharacterSheetRepository;
  characterSheetStorage: CharacterSheetStorage;
}

export function createGetCharacterSheetImageContentUseCase(
  dependencies: GetCharacterSheetImageContentUseCaseDependencies,
): GetCharacterSheetImageContentUseCase {
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

      const content = await dependencies.characterSheetStorage.getImageContent({
        character,
      });

      if (!content) {
        throw new CharacterSheetImageNotFoundError(input.characterId);
      }

      return content;
    },
  };
}
