import type { CurrentMasterPlot } from "@sweet-star/shared";

import { createSceneSheetBatchRecord, createSceneSheetRecord } from "../domain/scene-sheet";
import {
  createTaskRecord,
  sceneSheetGenerateQueueName,
  type SceneSheetGenerateTaskInput,
  type SceneSheetsGenerateTaskInput,
} from "../domain/task";
import { ProjectNotFoundError } from "../errors/project-errors";
import { TaskNotFoundError } from "../errors/task-errors";
import { CurrentMasterPlotNotFoundError } from "../errors/storyboard-errors";
import type { CharacterSheetRepository } from "../ports/character-sheet-repository";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { SceneSheetRepository } from "../ports/scene-sheet-repository";
import type { SceneSheetStorage } from "../ports/scene-sheet-storage";
import type { TaskFileStorage } from "../ports/task-file-storage";
import type { TaskIdGenerator } from "../ports/task-id-generator";
import type { TaskQueue } from "../ports/task-queue";
import type { TaskRepository } from "../ports/task-repository";
import type { MasterPlotStorage } from "../ports/storyboard-storage";
import { isTaskStillActive } from "./task-reset-guard";

export interface ProcessSceneSheetsGenerateTaskInput {
  taskId: string;
}

export interface ProcessSceneSheetsGenerateTaskUseCase {
  execute(input: ProcessSceneSheetsGenerateTaskInput): Promise<void>;
}

export interface ProcessSceneSheetsGenerateTaskUseCaseDependencies {
  taskRepository: TaskRepository;
  projectRepository: ProjectRepository;
  taskFileStorage: TaskFileStorage;
  masterPlotStorage: MasterPlotStorage;
  characterSheetRepository: CharacterSheetRepository;
  sceneSheetRepository: SceneSheetRepository;
  sceneSheetStorage: SceneSheetStorage;
  taskQueue: TaskQueue;
  taskIdGenerator: TaskIdGenerator;
  clock: Clock;
}

export function createProcessSceneSheetsGenerateTaskUseCase(
  dependencies: ProcessSceneSheetsGenerateTaskUseCaseDependencies,
): ProcessSceneSheetsGenerateTaskUseCase {
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
        assertSceneSheetsTaskInput(taskInput);
        const activeTaskInput: SceneSheetsGenerateTaskInput = taskInput;
        const project = await dependencies.projectRepository.findById(task.projectId);

        if (!project) {
          throw new ProjectNotFoundError(task.projectId);
        }

        const masterPlot = await dependencies.masterPlotStorage.readCurrentMasterPlot({
          storageDir: project.storageDir,
        });

        if (!masterPlot || masterPlot.id !== activeTaskInput.sourceMasterPlotId) {
          throw new CurrentMasterPlotNotFoundError(project.id);
        }

        const sourceCharacterBatch = await dependencies.characterSheetRepository.findBatchById(
          activeTaskInput.sourceCharacterSheetBatchId,
        );

        if (!sourceCharacterBatch) {
          throw new Error(
            `Character sheet batch not found: ${activeTaskInput.sourceCharacterSheetBatchId}`,
          );
        }

        const scenePlans = buildScenePlans(masterPlot);
        const batch = createSceneSheetBatchRecord({
          id: activeTaskInput.batchId,
          projectId: project.id,
          projectStorageDir: project.storageDir,
          sourceMasterPlotId: activeTaskInput.sourceMasterPlotId,
          sourceCharacterSheetBatchId: activeTaskInput.sourceCharacterSheetBatchId,
          sceneCount: scenePlans.length,
          createdAt: startedAt,
          updatedAt: startedAt,
        });

        if (!(await isTaskStillActive(dependencies.taskRepository, task.id))) {
          return;
        }

        await dependencies.sceneSheetRepository.insertBatch(batch);
        await dependencies.sceneSheetStorage.writeBatchManifest({ batch });
        await dependencies.projectRepository.updateCurrentSceneSheetBatch?.({
          projectId: project.id,
          batchId: batch.id,
        });

        const queuedSceneIds: string[] = [];

        for (const [index, scenePlan] of scenePlans.entries()) {
          const sceneId = `scene_${toBatchToken(batch.id)}_${index + 1}`;
          const createdScene = createSceneSheetRecord({
            id: sceneId,
            projectId: project.id,
            projectStorageDir: project.storageDir,
            batchId: batch.id,
            sourceMasterPlotId: activeTaskInput.sourceMasterPlotId,
            sourceCharacterSheetBatchId: activeTaskInput.sourceCharacterSheetBatchId,
            sceneName: scenePlan.sceneName,
            scenePurpose: scenePlan.scenePurpose,
            promptTextGenerated: scenePlan.promptText,
            promptTextCurrent: scenePlan.promptText,
            constraintsText: scenePlan.constraintsText,
            updatedAt: startedAt,
            status: "generating",
            sourceTaskId: task.id,
          });
          const sceneTask = createTaskRecord({
            id: dependencies.taskIdGenerator.generateTaskId(),
            projectId: project.id,
            projectStorageDir: project.storageDir,
            type: "scene_sheet_generate",
            queueName: sceneSheetGenerateQueueName,
            createdAt: startedAt,
          });
          const sceneTaskInput: SceneSheetGenerateTaskInput = {
            taskId: sceneTask.id,
            projectId: project.id,
            taskType: "scene_sheet_generate",
            batchId: batch.id,
            sceneId: createdScene.id,
            sourceMasterPlotId: activeTaskInput.sourceMasterPlotId,
            sourceCharacterSheetBatchId: activeTaskInput.sourceCharacterSheetBatchId,
            sceneName: createdScene.sceneName,
            scenePurpose: createdScene.scenePurpose,
            promptTextCurrent: createdScene.promptTextCurrent,
            constraintsText: createdScene.constraintsText,
            imagePromptTemplateKey: "scene_sheet.generate",
          };

          await dependencies.sceneSheetRepository.insertScene({
            ...createdScene,
            sourceTaskId: sceneTask.id,
          });
          await dependencies.sceneSheetStorage.writeGeneratedPrompt({
            scene: {
              ...createdScene,
              sourceTaskId: sceneTask.id,
            },
            promptVariables: {
              sceneName: createdScene.sceneName,
              scenePurpose: createdScene.scenePurpose,
              promptTextCurrent: createdScene.promptTextCurrent,
              constraintsText: createdScene.constraintsText,
            },
          });
          await dependencies.taskRepository.insert(sceneTask);
          await dependencies.taskFileStorage.createTaskArtifacts({
            task: sceneTask,
            input: sceneTaskInput,
          });
          await dependencies.taskQueue.enqueue({
            taskId: sceneTask.id,
            queueName: sceneTask.queueName,
            taskType: sceneTask.type,
          });
          queuedSceneIds.push(createdScene.id);
        }

        const finishedAt = dependencies.clock.now();
        await dependencies.taskFileStorage.writeTaskOutput({
          task,
          output: {
            batchId: batch.id,
            sceneCount: scenePlans.length,
            sceneIds: queuedSceneIds,
          },
        });
        await dependencies.taskFileStorage.appendTaskLog({
          task,
          message: "scene sheets batch succeeded",
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
          message: `scene sheets batch failed: ${errorMessage}`,
        });
        await dependencies.taskRepository.markFailed({
          taskId: task.id,
          errorMessage,
          updatedAt: finishedAt,
          finishedAt,
        });
        await dependencies.projectRepository.updateStatus({
          projectId: task.projectId,
          status: "character_sheets_approved",
          updatedAt: finishedAt,
        });
        throw error;
      }
    },
  };
}

function assertSceneSheetsTaskInput(input: { taskType: string }): asserts input is SceneSheetsGenerateTaskInput {
  if (input.taskType !== "scene_sheets_generate") {
    throw new Error(`Unsupported task input for scene sheets processing: ${input.taskType}`);
  }
}

function toBatchToken(batchId: string) {
  return batchId.replace(/^scene_batch_/, "");
}

interface ScenePlan {
  sceneName: string;
  scenePurpose: string;
  constraintsText: string;
  promptText: string;
}

function buildScenePlans(masterPlot: CurrentMasterPlot) {
  const knownPatternPlans = buildScenePlansFromKnownPatterns(masterPlot);

  if (knownPatternPlans.length > 0) {
    return dedupeScenePlans(knownPatternPlans);
  }

  const textDerivedPlans = buildScenePlansFromText(masterPlot);

  if (textDerivedPlans.length > 0) {
    return dedupeScenePlans(textDerivedPlans);
  }

  return buildFallbackScenePlans(masterPlot);
}

function buildScenePlansFromKnownPatterns(masterPlot: CurrentMasterPlot): ScenePlan[] {
  const corpus = normalizeSceneText(
    [masterPlot.logline, masterPlot.synopsis, masterPlot.coreConflict, masterPlot.endingBeat].join(
      " ",
    ),
  );
  const plans: ScenePlan[] = [];

  if (containsAny(corpus, ["cbd", "办公", "大厅", "合同", "咖啡", "手机黑屏"])) {
    plans.push({
      sceneName: "现代CBD办公区",
      scenePurpose: "承接主角连续倒霉遭遇的都市核心场景。",
      constraintsText:
        "保持现代商务区、高层玻璃幕墙、冷灰办公材质与都市压迫感，不混入仪式或角色动作描述。",
      promptText:
        "现代CBD办公区，高层玻璃幕墙、冷灰商务大堂、金属电梯厅、电子屏冷光、咖啡污渍与散落纸张。",
    });
  }

  if (containsAny(corpus, ["玄学", "大师", "仪式", "化太岁", "护身符", "法坛"])) {
    plans.push({
      sceneName: "化太岁仪式空间",
      scenePurpose: "承接转运仪式与命运逆转的核心内景空间。",
      constraintsText:
        "保持法坛、香炉、符纸、暖金光源与封闭静场氛围，不混入都市办公陈设或具体人物动作。",
      promptText:
        "玄学仪式空间，木质法坛、香炉、符纸、供器、护身符、暖金烛光、封闭静场。",
    });
  }

  if (containsAny(corpus, ["财团", "总裁", "投资", "大厅", "高空坠物"])) {
    plans.push({
      sceneName: "财团大厅",
      scenePurpose: "承接命运翻盘、获得投资的核心公共商务场景。",
      constraintsText:
        "保持高挑商务大厅、石材地面、玻璃立面与通透入口，不混入仪式元素或多余叙事说明。",
      promptText:
        "财团大厅，高挑中庭、石材地面、玻璃立面、冷白天光、开阔入口、克制商务秩序。",
    });
  }

  return dedupeScenePlans(plans);
}

function buildScenePlansFromText(masterPlot: CurrentMasterPlot): ScenePlan[] {
  const corpus = [
    masterPlot.logline,
    masterPlot.synopsis,
    masterPlot.coreConflict,
    masterPlot.emotionalArc,
    masterPlot.endingBeat,
  ]
    .map((text) => collapseWhitespace(text))
    .filter((text) => text.length > 0)
    .join("，");
  const matchedNames = extractSceneCandidates(corpus);

  return matchedNames.map((sceneName) => {
    const promptText = buildPromptFromSceneName(sceneName);

    return {
      sceneName,
      scenePurpose: `作为“${sceneName}”的项目级环境锚点，供后续分镜与镜头稳定复用。`,
      constraintsText:
        "只描述场景空间、材质、陈设、光线与氛围，不写角色动作、剧情推进或镜头调度。",
      promptText,
    };
  });
}

function buildFallbackScenePlans(masterPlot: CurrentMasterPlot): ScenePlan[] {
  const titleSeed = masterPlot.title?.trim() || "当前项目";
  const synopsis = collapseWhitespace(masterPlot.synopsis);
  const logline = collapseWhitespace(masterPlot.logline);
  const emotionalArc = collapseWhitespace(masterPlot.emotionalArc);

  return dedupeScenePlans([
    {
      sceneName: "主舞台空间",
      scenePurpose: `${titleSeed} 的主要叙事环境锚点。`,
      constraintsText:
        "保持项目主环境的空间结构、时代质感、材质与整体氛围，只描述环境本身，不写角色表演或镜头调度。",
      promptText: buildFallbackPromptFromText(
        synopsis || logline,
        "项目主要场景，稳定空间结构、环境气质与可复用陈设。",
      ),
    },
    {
      sceneName: "转折场景",
      scenePurpose: `${titleSeed} 的关键转折环境锚点。`,
      constraintsText:
        "保持关键转折场景的空间识别度、光线气质与陈设，不混入完整剧情讲述。",
      promptText: buildFallbackPromptFromText(
        emotionalArc || synopsis || logline,
        "关键转折场景，强调空间、材质、光线和情绪氛围。",
      ),
    },
  ]);
}

function buildFallbackPromptFromText(sourceText: string, fallback: string) {
  const cleaned = stripNarrativeWords(sourceText);

  if (!cleaned) {
    return fallback;
  }

  const segments = cleaned
    .split(/[，。；、,.!！?？]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length >= 4)
    .slice(0, 3);

  return segments.length > 0 ? segments.join("，") : fallback;
}

function stripNarrativeWords(text: string) {
  return collapseWhitespace(text)
    .replace(/镜头|开篇|结尾|展示|呈现|绝望中|在大师的引导下|不仅|还|意外|当场|终于|步入|进入|赶到|寻找|等待天亮|等待|救下|获得|翻盘|选择|出发|穿过/g, "")
    .replace(/林峰|苏晚|主角|角色|人物|他|她|他们/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSceneText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function containsAny(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token.toLowerCase()));
}

function dedupeScenePlans(plans: ScenePlan[]) {
  const seenNames = new Set<string>();

  return plans.filter((plan) => {
    const key = plan.sceneName.trim();

    if (!key || seenNames.has(key)) {
      return false;
    }

    seenNames.add(key);
    return true;
  });
}

function collapseWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

const sceneSuffixes = [
  "办公区",
  "大厅",
  "空间",
  "卧室",
  "出租屋",
  "走廊",
  "停车场",
  "温室",
  "市场",
  "码头",
  "诊所",
  "办公室",
  "中庭",
  "站台",
  "天台",
  "仓库",
  "厂房",
  "病房",
  "楼道",
  "庭院",
];

function extractSceneCandidates(text: string) {
  const deduped = new Set<string>();
  const segments = text
    .split(/[，。；、,.!！?？\n]/)
    .map((segment) => collapseWhitespace(segment))
    .filter((segment) => segment.length >= 2);

  for (const segment of segments) {
    const sceneName = inferSceneNameFromSegment(segment);

    if (sceneName) {
      deduped.add(sceneName);
    }
  }

  return Array.from(deduped).slice(0, 4);
}

function inferSceneNameFromSegment(segment: string) {
  const cleaned = stripNarrativeWords(segment);

  for (const suffix of sceneSuffixes) {
    const index = cleaned.indexOf(suffix);

    if (index < 0) {
      continue;
    }

    const start = Math.max(0, index - 4);
    const candidate = cleaned.slice(start, index + suffix.length).replace(/[“”"'：:]/g, "").trim();

    if (candidate.length >= suffix.length && candidate.length <= 10) {
      return trimSceneNameNoise(candidate);
    }
  }

  return null;
}

function buildPromptFromSceneName(sceneName: string) {
  if (sceneName.includes("出租屋")) {
    return `${sceneName}，低矮层高、旧墙面、生活痕迹、狭窄动线、冷夜室内光。`;
  }

  if (sceneName.includes("停车场")) {
    return `${sceneName}，混凝土立柱、低色温顶灯、潮湿地面、回声感、稀疏车辆。`;
  }

  if (sceneName.includes("走廊")) {
    return `${sceneName}，狭长通道、连续门牌、冷白顶灯、安静空气、克制纵深。`;
  }

  if (sceneName.includes("温室")) {
    return `${sceneName}，玻璃结构、潮湿叶片、晨雾薄光、金属框架、静止空气。`;
  }

  if (sceneName.includes("大厅")) {
    return `${sceneName}，高挑空间、石材或金属材质、开阔入口、均匀天光、秩序感陈设。`;
  }

  if (sceneName.includes("办公区")) {
    return `${sceneName}，玻璃隔断、冷灰材质、整齐工位、电子屏冷光、克制商务氛围。`;
  }

  return `${sceneName}，稳定空间结构、明确材质层次、可复用陈设、统一光线气质。`;
}

function trimSceneNameNoise(sceneName: string) {
  return sceneName.replace(/^(从|在|又|到|向|往|于)/, "").trim();
}
