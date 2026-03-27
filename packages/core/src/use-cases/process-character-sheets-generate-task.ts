import type { CurrentMasterPlot } from "@sweet-star/shared";

import {
  createCharacterSheetBatchRecord,
  createCharacterSheetRecord,
} from "../domain/character-sheet";
import {
  characterSheetGenerateQueueName,
  createTaskRecord,
  type CharacterSheetGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import { CurrentMasterPlotNotFoundError } from "../errors/storyboard-errors";
import type { CharacterSheetPromptProvider } from "../ports/character-sheet-provider";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { CharacterSheetStorage } from "../ports/character-sheet-storage";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import type { MasterPlotStorage } from "../ports/storyboard-storage";
import { isTaskStillActive } from "./task-reset-guard";

export interface ProcessCharacterSheetsGenerateTaskInput {
  taskId: string;
}

export interface ProcessCharacterSheetsGenerateTaskUseCase {
  execute(input: ProcessCharacterSheetsGenerateTaskInput): Promise<void>;
}

export interface ProcessCharacterSheetsGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  masterPlotStorage: MasterPlotStorage;
  characterSheetRepository: CharacterSheetRepository;
  characterSheetStorage: CharacterSheetStorage;
  characterSheetPromptProvider: CharacterSheetPromptProvider;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

const CHARACTER_PROMPT_CONCURRENCY = 4;

export function createProcessCharacterSheetsGenerateTaskUseCase(
  dependencies: ProcessCharacterSheetsGenerateTaskUseCaseDependencies,
): ProcessCharacterSheetsGenerateTaskUseCase {
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

      try {
        const taskInput = await dependencies.taskFileStorage.readTaskInput({ task });
        assertCharacterSheetsTaskInput(taskInput);
        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        const masterPlot = await dependencies.masterPlotStorage.readCurrentMasterPlot({
          storageDir: project.storageDir,
        });

        if (!masterPlot || masterPlot.id !== taskInput.sourceMasterPlotId) {
          throw new CurrentMasterPlotNotFoundError(project.id);
        }

        const batch = createCharacterSheetBatchRecord({
          id: toCharacterSheetBatchId(task.id),
          projectId: project.id,
          projectStorageDir: project.storageDir,
          sourceMasterPlotId: taskInput.sourceMasterPlotId,
          characterCount: taskInput.mainCharacters.length,
          createdAt: startedAt,
          updatedAt: startedAt,
        });

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        await dependencies.characterSheetRepository.insertBatch(batch);
        await dependencies.characterSheetStorage.writeBatchManifest({ batch });
        await dependencies.projectRepository.updateCurrentCharacterSheetBatch({
          projectId: project.id,
          batchId: batch.id,
        });

        const promptTemplate = await dependencies.characterSheetStorage.readPromptTemplate({
          storageDir: project.storageDir,
          promptTemplateKey: "character_sheet.prompt.generate",
        });

        await forEachWithConcurrencyLimit(
          taskInput.mainCharacters.map((characterName, index) => ({ characterName, index })),
          CHARACTER_PROMPT_CONCURRENCY,
          async ({ characterName, index }) => {
            if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
              return;
            }

            const promptText = renderCharacterPromptTemplate(
              promptTemplate,
              masterPlot,
              characterName,
            );
            const promptResult =
              await dependencies.characterSheetPromptProvider.generateCharacterPrompt({
                projectId: project.id,
                masterPlot,
                characterName,
                promptText,
              });

            if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
              return;
            }

            const character = createCharacterSheetRecord({
              id: toCharacterSheetId(batch.id, characterName, index),
              projectId: project.id,
              projectStorageDir: project.storageDir,
              batchId: batch.id,
              sourceMasterPlotId: taskInput.sourceMasterPlotId,
              characterName,
              promptTextGenerated: promptResult.promptText,
              promptTextCurrent: promptResult.promptText,
              updatedAt: startedAt,
            });

            await dependencies.characterSheetRepository.insertCharacter(character);
            await dependencies.characterSheetStorage.writeGeneratedPrompt({
              character,
              promptVariables: {
                characterName,
                masterPlot,
              },
            });
            const referenceImagePaths =
              await dependencies.characterSheetStorage.resolveReferenceImagePaths({
                character,
              });

            const characterTask = createTaskRecord({
              id: dependencies.taskIdGenerator.generateTaskId(),
              projectId: project.id,
              projectStorageDir: project.storageDir,
              type: "character_sheet_generate",
              queueName: characterSheetGenerateQueueName,
              createdAt: startedAt,
            });
            const characterTaskInput: CharacterSheetGenerateTaskInput = {
              taskId: characterTask.id,
              projectId: project.id,
              taskType: "character_sheet_generate",
              batchId: batch.id,
              characterId: character.id,
              sourceMasterPlotId: taskInput.sourceMasterPlotId,
              characterName,
              promptTextCurrent: character.promptTextCurrent,
              imagePromptTemplateKey: "character_sheet.turnaround.generate",
              ...(referenceImagePaths.length > 0 ? { referenceImagePaths } : {}),
            };

            await dependencies.taskRepository.insert(characterTask);
            await dependencies.taskFileStorage.createTaskArtifacts({
              task: characterTask,
              input: characterTaskInput,
            });
            await dependencies.taskQueue.enqueue({
              taskId: characterTask.id,
              queueName: characterTask.queueName,
              taskType: characterTask.type,
            });
          },
        );

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        const finishedAt = dependencies.clock.now();

        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            batchId: batch.id,
            characterCount: taskInput.mainCharacters.length,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "character sheets batch succeeded",
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

        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: `character sheets batch failed: ${errorMessage}`,
        });
        await dependencies.taskRepository.markFailed({
          taskId: task.id,
          errorMessage,
          updatedAt: finishedAt,
          finishedAt,
        });
        await dependencies.projectRepository.updateStatus({
          projectId: task.projectId,
          status: "master_plot_approved",
          updatedAt: finishedAt,
        });
        throw error;
      }
    },
  };
}

function assertCharacterSheetsTaskInput(input: {
  taskType: string;
}): asserts input is {
  taskId: string;
  projectId: string;
  taskType: "character_sheets_generate";
  sourceMasterPlotId: string;
  mainCharacters: string[];
} {
  if (input.taskType !== "character_sheets_generate") {
    throw new Error(`Unsupported task input for character sheets processing: ${input.taskType}`);
  }
}

function toCharacterSheetBatchId(taskId: string) {
  return `char_batch_${taskId}`;
}

function toCharacterSheetId(batchId: string, characterName: string, index: number) {
  return `char_${toBatchToken(batchId)}_${slugifyCharacterName(characterName)}_${index + 1}`;
}

function toBatchToken(batchId: string) {
  return batchId.replace(/^char_batch_/, "");
}

function slugifyCharacterName(characterName: string) {
  return characterName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "character";
}

function renderCharacterPromptTemplate(
  template: string,
  masterPlot: CurrentMasterPlot,
  characterName: string,
) {
  return template
    .replaceAll("{{characterName}}", characterName)
    .replaceAll("{{masterPlot.title}}", masterPlot.title ?? "")
    .replaceAll("{{masterPlot.logline}}", masterPlot.logline)
    .replaceAll("{{masterPlot.synopsis}}", masterPlot.synopsis)
    .replaceAll("{{masterPlot.mainCharacters}}", masterPlot.mainCharacters.join(", "))
    .replaceAll("{{masterPlot.coreConflict}}", masterPlot.coreConflict)
    .replaceAll("{{masterPlot.emotionalArc}}", masterPlot.emotionalArc)
    .replaceAll("{{masterPlot.endingBeat}}", masterPlot.endingBeat)
    .replaceAll(
      "{{masterPlot.targetDurationSec}}",
      masterPlot.targetDurationSec === null ? "" : String(masterPlot.targetDurationSec),
    );
}

async function forEachWithConcurrencyLimit<T>(
  items: T[],
  concurrency: number,
  iteratee: (item: T) => Promise<void>,
) {
  const queue = [...items];
  const workerCount = Math.min(Math.max(concurrency, 1), queue.length);

  if (workerCount === 0) {
    return;
  }

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();

        if (item === undefined) {
          return;
        }

        await iteratee(item);
      }
    }),
  );
}
