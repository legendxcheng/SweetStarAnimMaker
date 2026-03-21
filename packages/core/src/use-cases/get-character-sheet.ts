import type { CharacterSheetRecord } from "@sweet-star/shared";

import { CharacterSheetNotFoundError } from "../errors/character-sheet-errors";
import { ProjectNotFoundError } from "../errors/project-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { ProjectRepository } from "../ports/project-repository";

export interface GetCharacterSheetInput {
  projectId: string;
  characterId: string;
}

export interface GetCharacterSheetUseCase {
  execute(input: GetCharacterSheetInput): Promise<CharacterSheetRecord>;
}

export interface GetCharacterSheetUseCaseDependencies {
  projectRepository: ProjectRepository;
  characterSheetRepository: CharacterSheetRepository;
}

export function createGetCharacterSheetUseCase(
  dependencies: GetCharacterSheetUseCaseDependencies,
): GetCharacterSheetUseCase {
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

      return character;
    },
  };
}
