import type { CharacterSheetRecord } from "@sweet-star/shared";

import { CharacterSheetNotFoundError } from "../errors/character-sheet-errors";
import { ProjectNotFoundError } from "../errors/project-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { CharacterSheetStorage } from "../ports/character-sheet-storage";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";

export interface AddCharacterSheetReferenceImagesInput {
  projectId: string;
  characterId: string;
  files: Array<{
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
    contentBytes: Uint8Array;
  }>;
}

export interface AddCharacterSheetReferenceImagesUseCase {
  execute(input: AddCharacterSheetReferenceImagesInput): Promise<CharacterSheetRecord>;
}

export interface AddCharacterSheetReferenceImagesUseCaseDependencies {
  projectRepository: ProjectRepository;
  characterSheetRepository: CharacterSheetRepository;
  characterSheetStorage: CharacterSheetStorage;
  clock: Clock;
}

export function createAddCharacterSheetReferenceImagesUseCase(
  dependencies: AddCharacterSheetReferenceImagesUseCaseDependencies,
): AddCharacterSheetReferenceImagesUseCase {
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

      const createdAt = dependencies.clock.now();
      const referenceImages = await dependencies.characterSheetStorage.saveReferenceImages({
        character,
        files: input.files.map((file) => ({
          ...file,
          createdAt,
        })),
      });

      return {
        ...character,
        referenceImages,
      };
    },
  };
}
