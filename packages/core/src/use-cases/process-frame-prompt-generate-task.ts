import { matchesShotScriptSegmentSelector, type CharacterSheetRecord } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { CharacterSheetStorage } from "../ports/character-sheet-storage";
import type { Clock } from "../ports/clock";
import type { FramePromptProvider } from "../ports/frame-prompt-provider";
import type { ProjectRepository } from "../ports/project-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotImageStorage } from "../ports/shot-image-storage";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";

export interface ProcessFramePromptGenerateTaskInput {
  taskId: string;
}

export interface ProcessFramePromptGenerateTaskUseCase {
  execute(input: ProcessFramePromptGenerateTaskInput): Promise<void>;
}

export interface ProcessFramePromptGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  shotImageRepository: ShotImageRepository;
  shotImageStorage: ShotImageStorage;
  shotScriptStorage: ShotScriptStorage;
  characterSheetRepository: CharacterSheetRepository;
  characterSheetStorage: CharacterSheetStorage;
  framePromptProvider: FramePromptProvider;
  clock: Clock;
}

export function createProcessFramePromptGenerateTaskUseCase(
  dependencies: ProcessFramePromptGenerateTaskUseCaseDependencies,
): ProcessFramePromptGenerateTaskUseCase {
  return {
    async execute(input) {
      const task = await dependencies.taskRepository.findById(input.taskId);
      let frame:
        | Awaited<ReturnType<ProcessFramePromptGenerateTaskUseCaseDependencies["shotImageRepository"]["findFrameById"]>>
        | null
        | undefined;

      if (!task) {
        throw new TaskNotFoundError(input.taskId);
      }

      const startedAt = dependencies.clock.now();

      await dependencies.taskRepository.markRunning({
        taskId: task.id,
        updatedAt: startedAt,
        startedAt,
      });

      try {
        const taskInput = await dependencies.taskFileStorage.readTaskInput({ task });
        assertFramePromptTaskInput(taskInput);
        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        frame = await dependencies.shotImageRepository.findFrameById(taskInput.frameId);

        if (!frame || frame.projectId !== project.id) {
          throw new Error(`Frame not found for prompt generation: ${taskInput.frameId}`);
        }

        const currentShotScript = await dependencies.shotScriptStorage.readCurrentShotScript({
          storageDir: project.storageDir,
        });

        if (!currentShotScript || currentShotScript.id !== taskInput.sourceShotScriptId) {
          throw new CurrentShotScriptNotFoundError(project.id);
        }

        const segment = currentShotScript.segments.find((item) =>
          matchesShotScriptSegmentSelector(item, {
            sceneId: taskInput.sceneId,
            segmentId: taskInput.segmentId,
          }),
        );

        if (!segment) {
          throw new Error(`Shot script segment not found: ${taskInput.segmentId}`);
        }

        const characterRoster = await loadApprovedCharacterRoster({
          project,
          characterSheetBatchId: project.currentCharacterSheetBatchId,
          characterSheetRepository: dependencies.characterSheetRepository,
          characterSheetStorage: dependencies.characterSheetStorage,
        });

        const promptPlan = await dependencies.framePromptProvider.generateFramePrompt({
          projectId: project.id,
          frameType: taskInput.frameType,
          segment: {
            segmentId: segment.segmentId,
            sceneId: segment.sceneId,
            order: segment.order,
            summary: segment.summary,
            shots: segment.shots,
          },
          characterRoster: characterRoster.map((character) => ({
            characterId: character.id,
            characterName: character.characterName,
            promptTextCurrent: character.promptTextCurrent,
            imageAssetPath: character.imageAssetPath,
          })),
        });
        const validCharacterIds = new Set(characterRoster.map((character) => character.id));
        const selectedCharacterIds = promptPlan.selectedCharacterIds.filter((id) =>
          validCharacterIds.has(id)
        );
        const matchedReferenceImagePaths = selectedCharacterIds
          .map((id) => characterRoster.find((character) => character.id === id) ?? null)
          .filter((character): character is CharacterSheetRecord => character !== null)
          .flatMap((character) => (character.imageAssetPath ? [character.imageAssetPath] : []));
        const unmatchedCharacterIds = selectedCharacterIds.filter((id) => {
          const character = characterRoster.find((item) => item.id === id);
          return !character?.imageAssetPath;
        });
        const promptText = promptPlan.promptText.trim();

        if (!promptText) {
          throw new Error(`Frame prompt generation returned empty prompt for frame: ${frame.id}`);
        }

        const finishedAt = dependencies.clock.now();
        const updatedFrame = {
          ...frame,
          planStatus: "planned" as const,
          selectedCharacterIds,
          matchedReferenceImagePaths,
          unmatchedCharacterIds,
          promptTextSeed: promptText,
          promptTextCurrent: promptText,
          negativePromptTextCurrent: promptPlan.negativePromptText,
          promptUpdatedAt: finishedAt,
          updatedAt: finishedAt,
          sourceTaskId: task.id,
        };

        await dependencies.shotImageRepository.updateFrame(updatedFrame);
        await dependencies.shotImageStorage.writeFramePlanning({
          frame: updatedFrame,
          planning: {
            frameType: promptPlan.frameType,
            selectedCharacterIds,
            negativePromptText: promptPlan.negativePromptText,
            rationale: promptPlan.rationale,
            rawResponse: promptPlan.rawResponse,
            provider: promptPlan.provider,
            model: promptPlan.model,
          },
        });
        await dependencies.shotImageStorage.writeFramePromptFiles({
          frame: updatedFrame,
        });
        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            frameId: updatedFrame.id,
            selectedCharacterIds,
            matchedReferenceImagePaths,
            unmatchedCharacterIds,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "frame prompt generation succeeded",
        });
        await dependencies.taskRepository.markSucceeded({
          taskId: task.id,
          updatedAt: finishedAt,
          finishedAt,
        });
      } catch (error) {
        const finishedAt = dependencies.clock.now();
        const errorMessage = error instanceof Error ? error.message : "Task failed";

        if (frame) {
          await dependencies.shotImageRepository.updateFrame({
            ...frame,
            planStatus: "plan_failed",
            updatedAt: finishedAt,
            sourceTaskId: task.id,
          });
        }

        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `frame prompt generation failed: ${errorMessage}`,
        });
        await dependencies.taskRepository.markFailed({
          taskId: task.id,
          errorMessage,
          updatedAt: finishedAt,
          finishedAt,
        });
        throw error;
      }
    },
  };
}

async function loadApprovedCharacterRoster(input: {
  project: { storageDir: string };
  characterSheetBatchId: string | null;
  characterSheetRepository: CharacterSheetRepository;
  characterSheetStorage: CharacterSheetStorage;
}) {
  if (!input.characterSheetBatchId) {
    return [];
  }

  const characters = await input.characterSheetRepository.listCharactersByBatchId(
    input.characterSheetBatchId,
  );

  return characters
    .filter((character) => character.status === "approved")
    .map((character) => ({
      id: character.id,
      projectId: character.projectId,
      batchId: character.batchId,
      sourceMasterPlotId: character.sourceMasterPlotId,
      characterName: character.characterName,
      promptTextGenerated: character.promptTextGenerated,
      promptTextCurrent: character.promptTextCurrent,
      referenceImages: character.referenceImages,
      imageAssetPath: character.imageAssetPath,
      imageWidth: character.imageWidth,
      imageHeight: character.imageHeight,
      provider: character.provider,
      model: character.model,
      status: character.status,
      updatedAt: character.updatedAt,
      approvedAt: character.approvedAt,
      sourceTaskId: character.sourceTaskId,
    })) satisfies CharacterSheetRecord[];
}

function assertFramePromptTaskInput(input: {
  taskType: string;
}): asserts input is {
  taskId: string;
  projectId: string;
  taskType: "frame_prompt_generate";
  batchId: string;
  frameId: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  frameType: "start_frame" | "end_frame";
} {
  if (input.taskType !== "frame_prompt_generate") {
    throw new Error(`Unsupported task input for frame prompt processing: ${input.taskType}`);
  }
}
