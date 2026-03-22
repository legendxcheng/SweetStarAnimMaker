import type { CharacterSheetRecord } from "@sweet-star/shared";

import { CharacterSheetNotFoundError } from "../errors/character-sheet-errors";
import { ProjectNotFoundError } from "../errors/project-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { CharacterSheetStorage } from "../ports/character-sheet-storage";
import type { ProjectRepository } from "../ports/project-repository";

export interface DeleteCharacterSheetReferenceImageInput {
  projectId: string;
  characterId: string;
  referenceImageId: string;
}

export interface DeleteCharacterSheetReferenceImageUseCase {
  execute(input: DeleteCharacterSheetReferenceImageInput): Promise<CharacterSheetRecord>;
}

export interface DeleteCharacterSheetReferenceImageUseCaseDependencies {
  projectRepository: ProjectRepository;
  characterSheetRepository: CharacterSheetRepository;
  characterSheetStorage: CharacterSheetStorage;
}

export function createDeleteCharacterSheetReferenceImageUseCase(
  dependencies: DeleteCharacterSheetReferenceImageUseCaseDependencies,
): DeleteCharacterSheetReferenceImageUseCase {
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

      const referenceImages = await dependencies.characterSheetStorage.deleteReferenceImage({
        character,
        referenceImageId: input.referenceImageId,
      });

      return {
        ...character,
        referenceImages,
      };
    },
  };
}
