import {
  toShotScriptSegmentStorageKey,
  type CurrentShotScript,
  type SaveShotScriptSegmentRequest,
} from "@sweet-star/shared";

import {
  mergeShotScriptSegment,
  toEditedShotScriptSegment,
} from "../domain/shot-script";
import { buildShotScriptCanonicalCharacterValidator } from "../domain/shot-script-canonical-character-validator";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { CharacterSheetStorage } from "../ports/character-sheet-storage";
import { ProjectNotFoundError } from "../errors/project-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import { resolveShotScriptSegment } from "./resolve-shot-script-segment";

export interface SaveHumanShotScriptSegmentInput extends SaveShotScriptSegmentRequest {
  projectId: string;
  segmentId: string;
}

export interface SaveHumanShotScriptSegmentUseCase {
  execute(input: SaveHumanShotScriptSegmentInput): Promise<CurrentShotScript>;
}

export interface SaveHumanShotScriptSegmentUseCaseDependencies {
  projectRepository: ProjectRepository;
  characterSheetRepository: CharacterSheetRepository;
  characterSheetStorage: CharacterSheetStorage;
  shotScriptStorage: ShotScriptStorage;
  clock: Clock;
}

export function createSaveHumanShotScriptSegmentUseCase(
  dependencies: SaveHumanShotScriptSegmentUseCaseDependencies,
): SaveHumanShotScriptSegmentUseCase {
  return {
    async execute(input) {
      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const currentShotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
        storageDir: project.storageDir,
      });

      if (!currentShotScript) {
        throw new CurrentShotScriptNotFoundError(project.id);
      }

      const { segment: currentSegment } = resolveShotScriptSegment(
        currentShotScript.segments,
        input.segmentId,
      );
      const approvedCharacters = await loadApprovedCharacters({
        project,
        characterSheetRepository: dependencies.characterSheetRepository,
        characterSheetStorage: dependencies.characterSheetStorage,
      });
      const violations = buildShotScriptCanonicalCharacterValidator(approvedCharacters).validateShots(
        input.shots,
      );

      if (violations.length > 0) {
        throw new Error(violations.map((violation) => violation.message).join("\n"));
      }

      const updatedAt = dependencies.clock.now();
      const updatedShotScript = mergeShotScriptSegment(
        currentShotScript,
        toEditedShotScriptSegment({
          baseSegment: currentSegment,
          name: input.name,
          summary: input.summary,
          durationSec: input.durationSec,
          shots: input.shots,
        }),
        updatedAt,
      );

      await dependencies.shotScriptStorage.writeShotScriptVersion({
        storageDir: project.storageDir,
        versionId: toHumanShotScriptVersionId(updatedAt, currentSegment),
        kind: "human",
        shotScript: updatedShotScript,
      });
      await dependencies.shotScriptStorage.writeCurrentShotScript({
        storageDir: project.storageDir,
        shotScript: updatedShotScript,
      });
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: updatedShotScript.approvedAt ? "shot_script_approved" : "shot_script_in_review",
        updatedAt,
      });

      return updatedShotScript;
    },
  };
}

function toHumanShotScriptVersionId(
  updatedAt: string,
  segment: { sceneId: string; segmentId: string },
) {
  return `human-${toShotScriptSegmentStorageKey(segment)}-${updatedAt.replaceAll(/[:.]/g, "-")}`;
}

async function loadApprovedCharacters(input: {
  project: {
    currentCharacterSheetBatchId: string | null;
    storageDir: string;
  };
  characterSheetRepository: CharacterSheetRepository;
  characterSheetStorage: CharacterSheetStorage;
}) {
  if (!input.project.currentCharacterSheetBatchId) {
    return [];
  }

  const characters = await input.characterSheetRepository.listCharactersByBatchId(
    input.project.currentCharacterSheetBatchId,
  );

  return characters.map((character) => ({
    characterId: character.id,
    characterName: character.characterName,
    promptTextCurrent: character.promptTextCurrent,
    imageAssetPath: character.imageAssetPath,
  }));
}
