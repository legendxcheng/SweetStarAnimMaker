import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  TaskNotFoundError,
  createProcessSceneSheetsGenerateTaskUseCase,
} from "../src/index";

describe("process scene sheets generate task use case", () => {
  it("derives multiple core scenes from the master plot, stores scene-only prompts, and enqueues one task per scene", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260422_scene_batch",
        projectId: "proj_1",
        type: "scene_sheets_generate",
        status: "pending",
        queueName: "scene-sheets-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_20260422_scene_batch",
        inputRelPath: "tasks/task_20260422_scene_batch/input.json",
        outputRelPath: "tasks/task_20260422_scene_batch/output.json",
        logRelPath: "tasks/task_20260422_scene_batch/log.txt",
        errorMessage: null,
        createdAt: "2026-04-22T00:00:00.000Z",
        updatedAt: "2026-04-22T00:00:00.000Z",
        startedAt: null,
        finishedAt: null,
      }),
      findLatestByProjectId: vi.fn(),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_1-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        visualStyleText: "冷色电影感",
        currentMasterPlotId: "mp_1",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentSceneSheetBatchId: null,
        currentStoryboardId: null,
        currentShotScriptId: null,
        currentImageBatchId: null,
        currentVideoBatchId: null,
        status: "scene_sheets_generating",
        createdAt: "2026-04-22T00:00:00.000Z",
        updatedAt: "2026-04-22T00:00:00.000Z",
        premiseUpdatedAt: "2026-04-22T00:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentSceneSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateCurrentVideoBatch: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_20260422_scene_batch",
        projectId: "proj_1",
        taskType: "scene_sheets_generate",
        batchId: "scene_batch_v1",
        sourceMasterPlotId: "mp_1",
        sourceCharacterSheetBatchId: "char_batch_v1",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const masterPlotStorage = {
      readCurrentMasterPlot: vi.fn().mockResolvedValue({
        id: "mp_1",
        title: "化太岁逆转人生",
        logline:
          "林峰在现代CBD连续遭遇霉运，求助玄学大师完成化太岁仪式后，于财团大厅逆转命运。",
        synopsis:
          "开篇展示林峰在现代CBD遭遇手机黑屏、咖啡泼洒、重要合同意外损毁的连续霉运。绝望中他求助玄学大师，在大师的引导下完成化太岁仪式。仪式后林峰步入大厅，不仅避开高空坠物，还救下财团总裁并获得投资。结尾他看着胸前发光的护身符，接到了大客户的主动来电。",
        mainCharacters: ["林峰", "玄学大师", "财团总裁"],
        coreConflict: "林峰必须在彻底崩溃前找到打破连环霉运的方法。",
        emotionalArc: "他从被霉运压垮的绝望状态走向重新掌控命运的自信。",
        endingBeat: "护身符微光闪烁，大客户主动来电，林峰终于翻盘。",
        targetDurationSec: 480,
        sourceTaskId: "task-master-plot",
        updatedAt: "2026-04-22T00:00:00.000Z",
        approvedAt: "2026-04-22T00:01:00.000Z",
      }),
    };
    const characterSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn().mockResolvedValue({
        id: "char_batch_v1",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceMasterPlotId: "mp_1",
        characterCount: 2,
        storageDir: "projects/proj_1-my-story/character-sheets/batches/char_batch_v1",
        manifestRelPath: "character-sheets/batches/char_batch_v1/manifest.json",
        createdAt: "2026-04-22T00:00:00.000Z",
        updatedAt: "2026-04-22T00:01:00.000Z",
      }),
      listCharactersByBatchId: vi.fn(),
      insertCharacter: vi.fn(),
      findCharacterById: vi.fn(),
      updateCharacter: vi.fn(),
    };
    const sceneSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      listScenesByBatchId: vi.fn(),
      insertScene: vi.fn(),
      findSceneById: vi.fn(),
      updateScene: vi.fn(),
    };
    const sceneSheetStorage = {
      writeBatchManifest: vi.fn(),
      writeGeneratedPrompt: vi.fn(),
      writeImageVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      readPromptTemplate: vi.fn(),
    };
    const taskQueue = {
      enqueue: vi.fn(),
    };
    const useCase = createProcessSceneSheetsGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      masterPlotStorage,
      characterSheetRepository,
      sceneSheetRepository,
      sceneSheetStorage,
      taskQueue,
      taskIdGenerator: {
        generateTaskId: vi
          .fn()
          .mockReturnValueOnce("task_scene_1")
          .mockReturnValueOnce("task_scene_2")
          .mockReturnValueOnce("task_scene_3"),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-04-22T00:01:00.000Z")
          .mockReturnValueOnce("2026-04-22T00:02:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_20260422_scene_batch" });

    expect(sceneSheetRepository.insertBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "scene_batch_v1",
        sceneCount: 3,
      }),
    );
    expect(sceneSheetRepository.insertScene).toHaveBeenCalledTimes(3);
    expect(sceneSheetRepository.insertScene).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sceneName: "现代CBD办公区",
        imageAssetPath: null,
        promptTextGenerated:
          "现代CBD办公区，高层玻璃幕墙、冷灰商务大堂、金属电梯厅、电子屏冷光、咖啡污渍与散落纸张。",
        promptTextCurrent:
          "现代CBD办公区，高层玻璃幕墙、冷灰商务大堂、金属电梯厅、电子屏冷光、咖啡污渍与散落纸张。",
      }),
    );
    expect(sceneSheetRepository.insertScene).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sceneName: "化太岁仪式空间",
        imageAssetPath: null,
        promptTextGenerated:
          "玄学仪式空间，木质法坛、香炉、符纸、供器、护身符、暖金烛光、封闭静场。",
        promptTextCurrent:
          "玄学仪式空间，木质法坛、香炉、符纸、供器、护身符、暖金烛光、封闭静场。",
      }),
    );
    expect(sceneSheetRepository.insertScene).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        sceneName: "财团大厅",
        imageAssetPath: null,
        promptTextGenerated:
          "财团大厅，高挑中庭、石材地面、玻璃立面、冷白天光、开阔入口、克制商务秩序。",
        promptTextCurrent:
          "财团大厅，高挑中庭、石材地面、玻璃立面、冷白天光、开阔入口、克制商务秩序。",
      }),
    );
    expect(sceneSheetStorage.writeGeneratedPrompt).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        promptVariables: {
          sceneName: "现代CBD办公区",
          scenePurpose: expect.any(String),
          promptTextCurrent:
            "现代CBD办公区，高层玻璃幕墙、冷灰商务大堂、金属电梯厅、电子屏冷光、咖啡污渍与散落纸张。",
          constraintsText:
            "保持现代商务区、高层玻璃幕墙、冷灰办公材质与都市压迫感，不混入仪式或角色动作描述。",
        },
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        input: expect.objectContaining({
          taskType: "scene_sheet_generate",
          sceneId: "scene_v1_1",
          promptTextCurrent:
            "现代CBD办公区，高层玻璃幕墙、冷灰商务大堂、金属电梯厅、电子屏冷光、咖啡污渍与散落纸张。",
        }),
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        input: expect.objectContaining({
          taskType: "scene_sheet_generate",
          sceneId: "scene_v1_2",
          promptTextCurrent:
            "玄学仪式空间，木质法坛、香炉、符纸、供器、护身符、暖金烛光、封闭静场。",
        }),
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        input: expect.objectContaining({
          taskType: "scene_sheet_generate",
          sceneId: "scene_v1_3",
          promptTextCurrent:
            "财团大厅，高挑中庭、石材地面、玻璃立面、冷白天光、开阔入口、克制商务秩序。",
        }),
      }),
    );
    expect(taskQueue.enqueue).toHaveBeenCalledTimes(3);
    expect(taskFileStorage.writeTaskOutput).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_20260422_scene_batch" }),
      output: {
        batchId: "scene_batch_v1",
        sceneCount: 3,
        sceneIds: ["scene_v1_1", "scene_v1_2", "scene_v1_3"],
      },
    });
  });

  it("extracts multiple reusable scenes from generic environment phrases when no hardcoded pattern matches", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260422_scene_batch_generic",
        projectId: "proj_1",
        type: "scene_sheets_generate",
        status: "pending",
        queueName: "scene-sheets-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_20260422_scene_batch_generic",
        inputRelPath: "tasks/task_20260422_scene_batch_generic/input.json",
        outputRelPath: "tasks/task_20260422_scene_batch_generic/output.json",
        logRelPath: "tasks/task_20260422_scene_batch_generic/log.txt",
        errorMessage: null,
        createdAt: "2026-04-22T00:00:00.000Z",
        updatedAt: "2026-04-22T00:00:00.000Z",
        startedAt: null,
        finishedAt: null,
      }),
      findLatestByProjectId: vi.fn(),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const insertedScenes: Array<{ sceneName: string; promptTextCurrent: string }> = [];
    const useCase = createProcessSceneSheetsGenerateTaskUseCase({
      taskRepository,
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_1",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_1-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          visualStyleText: "冷色电影感",
          currentMasterPlotId: "mp_1",
          currentCharacterSheetBatchId: "char_batch_v1",
          currentSceneSheetBatchId: null,
          currentStoryboardId: null,
          currentShotScriptId: null,
          currentImageBatchId: null,
          currentVideoBatchId: null,
          status: "scene_sheets_generating",
          createdAt: "2026-04-22T00:00:00.000Z",
          updatedAt: "2026-04-22T00:00:00.000Z",
          premiseUpdatedAt: "2026-04-22T00:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentSceneSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateCurrentVideoBatch: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_20260422_scene_batch_generic",
          projectId: "proj_1",
          taskType: "scene_sheets_generate",
          batchId: "scene_batch_v2",
          sourceMasterPlotId: "mp_1",
          sourceCharacterSheetBatchId: "char_batch_v1",
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      masterPlotStorage: {
        readCurrentMasterPlot: vi.fn().mockResolvedValue({
          id: "mp_1",
          title: "长夜回声",
          logline: "苏晚从老旧出租屋出发，在地下停车场失去线索，又穿过医院走廊进入天台温室。",
          synopsis:
            "苏晚在老旧出租屋醒来，赶到地下停车场寻找失踪的录音笔，随后穿过医院走廊，最后进入天台温室等待天亮。",
          mainCharacters: ["苏晚"],
          coreConflict: "她必须在天亮前拼起线索。",
          emotionalArc: "她从慌乱走向冷静。",
          endingBeat: "天台温室里出现了第一束晨光。",
          targetDurationSec: 420,
          sourceTaskId: "task-master-plot",
          updatedAt: "2026-04-22T00:00:00.000Z",
          approvedAt: "2026-04-22T00:01:00.000Z",
        }),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn().mockResolvedValue({
          id: "char_batch_v1",
          projectId: "proj_1",
          projectStorageDir: "projects/proj_1-my-story",
          sourceMasterPlotId: "mp_1",
          characterCount: 1,
          storageDir: "projects/proj_1-my-story/character-sheets/batches/char_batch_v1",
          manifestRelPath: "character-sheets/batches/char_batch_v1/manifest.json",
          createdAt: "2026-04-22T00:00:00.000Z",
          updatedAt: "2026-04-22T00:01:00.000Z",
        }),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      sceneSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listScenesByBatchId: vi.fn(),
        insertScene: vi.fn().mockImplementation((scene) => {
          insertedScenes.push({
            sceneName: scene.sceneName,
            promptTextCurrent: scene.promptTextCurrent,
          });
        }),
        findSceneById: vi.fn(),
        updateScene: vi.fn(),
      },
      sceneSheetStorage: {
        writeBatchManifest: vi.fn(),
        writeGeneratedPrompt: vi.fn(),
        writeImageVersion: vi.fn(),
        writeCurrentImage: vi.fn(),
        readPromptTemplate: vi.fn(),
      },
      taskQueue: {
        enqueue: vi.fn(),
      },
      taskIdGenerator: {
        generateTaskId: vi
          .fn()
          .mockReturnValueOnce("task_scene_generic_1")
          .mockReturnValueOnce("task_scene_generic_2")
          .mockReturnValueOnce("task_scene_generic_3")
          .mockReturnValueOnce("task_scene_generic_4"),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-04-22T00:01:00.000Z")
          .mockReturnValueOnce("2026-04-22T00:02:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_20260422_scene_batch_generic" });

    expect(insertedScenes.length).toBeGreaterThanOrEqual(3);
    expect(insertedScenes.map((scene) => scene.sceneName)).toEqual(
      expect.arrayContaining(["老旧出租屋", "地下停车场", "医院走廊"]),
    );
    for (const scene of insertedScenes) {
      expect(scene.promptTextCurrent).not.toMatch(/苏晚|镜头|赶到|寻找|等待天亮/);
    }
  });

  it("throws when the task does not exist", async () => {
    const useCase = createProcessSceneSheetsGenerateTaskUseCase({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        findLatestByProjectId: vi.fn(),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentSceneSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateCurrentVideoBatch: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn(),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      masterPlotStorage: {
        readCurrentMasterPlot: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      sceneSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listScenesByBatchId: vi.fn(),
        insertScene: vi.fn(),
        findSceneById: vi.fn(),
        updateScene: vi.fn(),
      },
      sceneSheetStorage: {
        writeBatchManifest: vi.fn(),
        writeGeneratedPrompt: vi.fn(),
        writeImageVersion: vi.fn(),
        writeCurrentImage: vi.fn(),
        readPromptTemplate: vi.fn(),
      },
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: { generateTaskId: vi.fn() },
      clock: { now: vi.fn() },
    });

    await expect(useCase.execute({ taskId: "missing-task" })).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
  });

  it("throws when the owning project does not exist", async () => {
    const useCase = createProcessSceneSheetsGenerateTaskUseCase({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_20260422_scene_batch",
          projectId: "proj_1",
          type: "scene_sheets_generate",
          status: "pending",
          queueName: "scene-sheets-generate",
          storageDir: "projects/proj_1-my-story/tasks/task_20260422_scene_batch",
          inputRelPath: "tasks/task_20260422_scene_batch/input.json",
          outputRelPath: "tasks/task_20260422_scene_batch/output.json",
          logRelPath: "tasks/task_20260422_scene_batch/log.txt",
          errorMessage: null,
          createdAt: "2026-04-22T00:00:00.000Z",
          updatedAt: "2026-04-22T00:00:00.000Z",
          startedAt: null,
          finishedAt: null,
        }),
        findLatestByProjectId: vi.fn(),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentSceneSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateCurrentVideoBatch: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_20260422_scene_batch",
          projectId: "proj_1",
          taskType: "scene_sheets_generate",
          batchId: "scene_batch_v1",
          sourceMasterPlotId: "mp_1",
          sourceCharacterSheetBatchId: "char_batch_v1",
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      masterPlotStorage: {
        readCurrentMasterPlot: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      sceneSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listScenesByBatchId: vi.fn(),
        insertScene: vi.fn(),
        findSceneById: vi.fn(),
        updateScene: vi.fn(),
      },
      sceneSheetStorage: {
        writeBatchManifest: vi.fn(),
        writeGeneratedPrompt: vi.fn(),
        writeImageVersion: vi.fn(),
        writeCurrentImage: vi.fn(),
        readPromptTemplate: vi.fn(),
      },
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: { generateTaskId: vi.fn() },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-04-22T00:01:00.000Z")
          .mockReturnValueOnce("2026-04-22T00:02:00.000Z"),
      },
    });

    await expect(useCase.execute({ taskId: "task_20260422_scene_batch" })).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });
});
