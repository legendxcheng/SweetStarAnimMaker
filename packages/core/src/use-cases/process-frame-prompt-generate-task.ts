import { matchesShotScriptSegmentSelector, type CharacterSheetRecord } from "@sweet-star/shared";

import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import { CurrentShotScriptNotFoundError } from "../errors/storyboard-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { CharacterSheetStorage } from "../ports/character-sheet-storage";
import type { Clock } from "../ports/clock";
import type { FramePromptProvider } from "../ports/frame-prompt-provider";
import type { ProjectRepository } from "../ports/project-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";
import type { ShotImageRepository } from "../ports/shot-image-repository";
import type { ShotImageStorage } from "../ports/shot-image-storage";
import type { ShotScriptStorage } from "../ports/shot-script-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";
import { resolveShotFrameRecord } from "./shot-reference-frame-helpers";
import { isTaskStillActive } from "./task-reset-guard";

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
  sceneSheetRepository?: SceneSheetRepository;
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
      let shot =
        null as
          | Awaited<
              ReturnType<
                NonNullable<
                  ProcessFramePromptGenerateTaskUseCaseDependencies["shotImageRepository"]["findShotById"]
                >
              >
            >
          | null;

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

        const resolvedShotFrame = await resolveShotFrameRecord({
          repository: dependencies.shotImageRepository,
          batchId: taskInput.batchId,
          shotId: taskInput.shotId,
          frameId: taskInput.frameId,
        });
        shot = resolvedShotFrame?.shot ?? null;
        frame =
          resolvedShotFrame?.frame ??
          (await dependencies.shotImageRepository.findFrameById(taskInput.frameId));

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

        const currentShot = segment.shots.find((item) => item.id === taskInput.shotId);

        if (!currentShot) {
          throw new Error(`Shot script shot not found: ${taskInput.shotId}`);
        }

        const characterRoster = await loadApprovedCharacterRoster({
          project,
          characterSheetBatchId: project.currentCharacterSheetBatchId,
          characterSheetRepository: dependencies.characterSheetRepository,
          characterSheetStorage: dependencies.characterSheetStorage,
        });
        const startFrameContext =
          taskInput.frameType === "end_frame" && shot
            ? {
                promptTextCurrent: shot.startFrame.promptTextCurrent,
                selectedCharacterIds: shot.startFrame.selectedCharacterIds,
                imageStatus: shot.startFrame.imageStatus,
                imageAssetPath: shot.startFrame.imageAssetPath,
              }
            : undefined;
        const sceneContext = buildShotScriptSceneContext({
          segment,
          currentShot,
        });
        const sceneCandidates = await loadApprovedSceneCandidates({
          project,
          sceneSheetRepository: dependencies.sceneSheetRepository,
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
          currentShot,
          startFrameContext,
          characterRoster: characterRoster.map((character) => ({
            characterId: character.id,
            characterName: character.characterName,
            promptTextCurrent: character.promptTextCurrent,
            imageAssetPath: character.imageAssetPath,
          })),
          sceneCandidates,
          sceneContext,
        });

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

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
        const selectedScene =
          sceneCandidates.find((scene) => scene.sceneId === promptPlan.selectedSceneId) ?? null;
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
            selectedSceneId: selectedScene?.sceneId ?? null,
            selectedSceneName: selectedScene?.sceneName ?? null,
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
        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        const finishedAt = dependencies.clock.now();
        const errorMessage = error instanceof Error ? error.message : "Task failed";

        if (frame) {
          const failedFrame = {
            ...frame,
            planStatus: "plan_failed" as const,
            updatedAt: finishedAt,
            sourceTaskId: task.id,
          };

          await dependencies.shotImageRepository.updateFrame(failedFrame);
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

async function loadApprovedSceneCandidates(input: {
  project: {
    currentSceneSheetBatchId?: string | null;
  };
  sceneSheetRepository?: SceneSheetRepository;
}) {
  const batchId = input.project.currentSceneSheetBatchId ?? null;

  if (!batchId || !input.sceneSheetRepository) {
    return [];
  }

  const scenes = await input.sceneSheetRepository.listScenesByBatchId(batchId);

  return scenes
    .filter((scene) => scene.status === "approved")
    .map((scene) => ({
      sceneId: scene.id,
      sceneName: scene.sceneName,
      scenePurpose: scene.scenePurpose,
      promptTextCurrent: scene.promptTextCurrent,
      constraintsText: scene.constraintsText,
      imageAssetPath: scene.imageAssetPath,
      environmentSummary: [scene.sceneName, scene.promptTextCurrent, scene.constraintsText]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join(" | "),
    }));
}

function buildShotScriptSceneContext(input: {
  segment: {
    sceneId: string;
    name?: string | null;
    summary: string;
  };
  currentShot: {
    visual: string;
    action: string;
    continuityNotes: string | null;
  };
}) {
  const derivedSummary = [
    input.segment.summary,
    input.currentShot.visual,
    input.currentShot.action,
    input.currentShot.continuityNotes ?? null,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" | ");

  return {
    source: "shot_script" as const,
    sceneId: input.segment.sceneId,
    sceneName: input.segment.name ?? null,
    scenePurpose: null,
    promptTextCurrent: null,
    constraintsText: input.currentShot.continuityNotes ?? null,
    imageAssetPath: null,
    environmentSummary: derivedSummary,
  };
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
