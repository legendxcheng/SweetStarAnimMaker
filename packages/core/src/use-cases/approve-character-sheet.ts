import type { CharacterSheetRecord } from "@sweet-star/shared";

import { CharacterSheetNotFoundError } from "../errors/character-sheet-errors";
import { ProjectNotFoundError } from "../errors/project-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";

export interface ApproveCharacterSheetInput {
  projectId: string;
  characterId: string;
}

export interface ApproveCharacterSheetUseCase {
  execute(input: ApproveCharacterSheetInput): Promise<CharacterSheetRecord>;
}

export interface ApproveCharacterSheetUseCaseDependencies {
  projectRepository: ProjectRepository;
  characterSheetRepository: CharacterSheetRepository;
  clock: Clock;
}

export function createApproveCharacterSheetUseCase(
  dependencies: ApproveCharacterSheetUseCaseDependencies,
): ApproveCharacterSheetUseCase {
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

      const approvedAt = dependencies.clock.now();
      const approvedCharacter = {
        ...character,
        status: "approved" as const,
        approvedAt,
        updatedAt: approvedAt,
      };

      await dependencies.characterSheetRepository.updateCharacter(approvedCharacter);

      const batchCharacters = await dependencies.characterSheetRepository.listCharactersByBatchId(
        approvedCharacter.batchId,
      );
      const effectiveCharacters = batchCharacters.map((batchCharacter) =>
        batchCharacter.id === approvedCharacter.id ? approvedCharacter : batchCharacter,
      );

      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: effectiveCharacters.every((batchCharacter) => batchCharacter.status === "approved")
          ? "character_sheets_approved"
          : "character_sheets_in_review",
        updatedAt: approvedAt,
      });

      return approvedCharacter;
    },
  };
}
