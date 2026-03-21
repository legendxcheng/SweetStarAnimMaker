import type { CharacterSheetRecord, UpdateCharacterSheetPromptRequest } from "@sweet-star/shared";

import { CharacterSheetNotFoundError } from "../errors/character-sheet-errors";
import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";

export interface UpdateCharacterSheetPromptInput extends UpdateCharacterSheetPromptRequest {
  projectId: string;
  characterId: string;
}

export interface UpdateCharacterSheetPromptUseCase {
  execute(input: UpdateCharacterSheetPromptInput): Promise<CharacterSheetRecord>;
}

export interface UpdateCharacterSheetPromptUseCaseDependencies {
  projectRepository: ProjectRepository;
  characterSheetRepository: CharacterSheetRepository;
  clock: Clock;
}

export function createUpdateCharacterSheetPromptUseCase(
  dependencies: UpdateCharacterSheetPromptUseCaseDependencies,
): UpdateCharacterSheetPromptUseCase {
  return {
    async execute(input) {
      const promptTextCurrent = input.promptTextCurrent.trim();

      if (!promptTextCurrent) {
        throw new ProjectValidationError("Character sheet prompt is required");
      }

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

      const updatedCharacter = {
        ...character,
        promptTextCurrent,
        updatedAt: dependencies.clock.now(),
      };

      await dependencies.characterSheetRepository.updateCharacter(updatedCharacter);

      return updatedCharacter;
    },
  };
}
