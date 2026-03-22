import { CharacterSheetNotFoundError } from "../errors/character-sheet-errors";
import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import type { CharacterSheetImageProvider } from "../ports/character-sheet-provider";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { CharacterSheetStorage } from "../ports/character-sheet-storage";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskRepository } from "../ports/task-repository";

export interface ProcessCharacterSheetGenerateTaskInput {
  taskId: string;
}

export interface ProcessCharacterSheetGenerateTaskUseCase {
  execute(input: ProcessCharacterSheetGenerateTaskInput): Promise<void>;
}

export interface ProcessCharacterSheetGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  characterSheetRepository: CharacterSheetRepository;
  characterSheetStorage: CharacterSheetStorage;
  characterSheetImageProvider: CharacterSheetImageProvider;
  clock: Clock;
}

export function createProcessCharacterSheetGenerateTaskUseCase(
  dependencies: ProcessCharacterSheetGenerateTaskUseCaseDependencies,
): ProcessCharacterSheetGenerateTaskUseCase {
  return {
    async execute(input) {
      const task = await dependencies.taskRepository.findById(input.taskId);

      if (!task) {
        throw new TaskNotFoundError(input.taskId);
      }

      const startedAt = dependencies.clock.now();

      await dependencies.taskRepository.markRunning({
        taskId: task.id,
        updatedAt: startedAt,
        startedAt,
      });

      let projectId = task.projectId;
      let batchId: string | null = null;
      let currentCharacter: Awaited<ReturnType<CharacterSheetRepository["findCharacterById"]>> =
        null;

      try {
        const taskInput = await dependencies.taskFileStorage.readTaskInput({ task });
        assertCharacterSheetTaskInput(taskInput);
        projectId = taskInput.projectId;
        batchId = taskInput.batchId;

        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        currentCharacter = await dependencies.characterSheetRepository.findCharacterById(
          taskInput.characterId,
        );

        if (!currentCharacter || currentCharacter.projectId !== project.id) {
          throw new CharacterSheetNotFoundError(taskInput.characterId);
        }

        const imagePromptTemplate = await dependencies.characterSheetStorage.readPromptTemplate({
          storageDir: project.storageDir,
          promptTemplateKey: taskInput.imagePromptTemplateKey,
        });
        const promptText = imagePromptTemplate
          .replaceAll("{{characterName}}", taskInput.characterName)
          .replaceAll("{{promptTextCurrent}}", taskInput.promptTextCurrent);
        const providerResult = await dependencies.characterSheetImageProvider.generateCharacterSheetImage(
          {
            projectId: project.id,
            characterId: taskInput.characterId,
            promptText,
            referenceImagePaths: taskInput.referenceImagePaths,
          },
        );
        const finishedAt = dependencies.clock.now();

        await dependencies.characterSheetStorage.writeImageVersion({
          character: currentCharacter,
          versionTag: `v-${finishedAt.replace(/[^0-9]/g, "")}`,
          imageBytes: providerResult.imageBytes,
          metadata: {
            width: providerResult.width,
            height: providerResult.height,
            provider: providerResult.provider,
            model: providerResult.model,
            rawResponse: providerResult.rawResponse,
          },
        });
        await dependencies.characterSheetStorage.writeCurrentImage({
          character: currentCharacter,
          imageBytes: providerResult.imageBytes,
          metadata: {
            width: providerResult.width,
            height: providerResult.height,
            provider: providerResult.provider,
            model: providerResult.model,
            rawResponse: providerResult.rawResponse,
          },
        });

        const updatedCharacter = {
          ...currentCharacter,
          imageWidth: providerResult.width,
          imageHeight: providerResult.height,
          provider: providerResult.provider,
          model: providerResult.model,
          status: "in_review" as const,
          approvedAt: null,
          updatedAt: finishedAt,
          sourceTaskId: task.id,
        };

        await dependencies.characterSheetRepository.updateCharacter(updatedCharacter);
        const batchCharacters = await dependencies.characterSheetRepository.listCharactersByBatchId(
          taskInput.batchId,
        );
        const effectiveCharacters = batchCharacters.map((character) =>
          character.id === updatedCharacter.id ? updatedCharacter : character,
        );

        if (effectiveCharacters.every((character) => character.status !== "generating")) {
          await dependencies.projectRepository.updateStatus({
            projectId: project.id,
            status: "character_sheets_in_review",
            updatedAt: finishedAt,
          });
        }

        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            characterId: updatedCharacter.id,
            width: providerResult.width,
            height: providerResult.height,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "character sheet generation succeeded",
        });
        await dependencies.taskRepository.markSucceeded({
          taskId: task.id,
          updatedAt: finishedAt,
          finishedAt,
        });
      } catch (error) {
        const finishedAt = dependencies.clock.now();
        const errorMessage = error instanceof Error ? error.message : "Task failed";

        if (currentCharacter) {
          const failedCharacter = {
            ...currentCharacter,
            status: "failed" as const,
            approvedAt: null,
            updatedAt: finishedAt,
            sourceTaskId: task.id,
          };

          await dependencies.characterSheetRepository.updateCharacter(failedCharacter);

          if (batchId) {
            const batchCharacters = await dependencies.characterSheetRepository.listCharactersByBatchId(
              batchId,
            );
            const effectiveCharacters = batchCharacters.map((character) =>
              character.id === failedCharacter.id ? failedCharacter : character,
            );

            if (effectiveCharacters.every((character) => character.status !== "generating")) {
              await dependencies.projectRepository.updateStatus({
                projectId,
                status: "character_sheets_in_review",
                updatedAt: finishedAt,
              });
            }
          }
        }

        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `character sheet generation failed: ${errorMessage}`,
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

function assertCharacterSheetTaskInput(input: {
  taskType: string;
}): asserts input is {
  taskId: string;
  projectId: string;
  taskType: "character_sheet_generate";
  batchId: string;
  characterId: string;
  sourceMasterPlotId: string;
  characterName: string;
  promptTextCurrent: string;
  imagePromptTemplateKey: "character_sheet.turnaround.generate";
  referenceImagePaths?: string[];
} {
  if (input.taskType !== "character_sheet_generate") {
    throw new Error(`Unsupported task input for character sheet processing: ${input.taskType}`);
  }
}
