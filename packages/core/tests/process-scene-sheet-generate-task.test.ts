import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  TaskNotFoundError,
  createProcessSceneSheetGenerateTaskUseCase,
} from "../src/index";

describe("process scene sheet generate task use case", () => {
  it("renders the image prompt, persists current assets, and marks the scene in review", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260422_scene_rain_dock_regen",
        projectId: "proj_1",
        type: "scene_sheet_generate",
        status: "pending",
        queueName: "scene-sheet-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_20260422_scene_rain_dock_regen",
        inputRelPath: "tasks/task_20260422_scene_rain_dock_regen/input.json",
        outputRelPath: "tasks/task_20260422_scene_rain_dock_regen/output.json",
        logRelPath: "tasks/task_20260422_scene_rain_dock_regen/log.txt",
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
        currentSceneSheetBatchId: "scene_batch_v1",
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
        taskId: "task_20260422_scene_rain_dock_regen",
        projectId: "proj_1",
        taskType: "scene_sheet_generate",
        batchId: "scene_batch_v1",
        sceneId: "scene_rain_dock",
        sourceMasterPlotId: "mp_1",
        sourceCharacterSheetBatchId: "char_batch_v1",
        sceneName: "暴雨码头",
        scenePurpose: "故事开场的核心外部环境。",
        promptTextCurrent:
          "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影，湿滑地面积水，远处吊机剪影。",
        constraintsText: "保持码头结构、远处吊机轮廓、暴雨夜氛围。",
        imagePromptTemplateKey: "scene_sheet.generate",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const sceneSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      listScenesByBatchId: vi.fn().mockResolvedValue([
        {
          id: "scene_rain_dock",
          status: "generating",
        },
        {
          id: "scene_clinic_corridor",
          status: "approved",
        },
      ]),
      insertScene: vi.fn(),
      findSceneById: vi.fn().mockResolvedValue({
        id: "scene_rain_dock",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        batchId: "scene_batch_v1",
        sourceMasterPlotId: "mp_1",
        sourceCharacterSheetBatchId: "char_batch_v1",
        sceneName: "暴雨码头",
        scenePurpose: "故事开场的核心外部环境。",
        promptTextGenerated: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
        promptTextCurrent:
          "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影，湿滑地面积水，远处吊机剪影。",
        constraintsText: "保持码头结构、远处吊机轮廓、暴雨夜氛围。",
        imageAssetPath:
          "scene-sheets/batches/scene_batch_v1/scenes/scene_rain_dock/current.png",
        imageWidth: null,
        imageHeight: null,
        provider: null,
        model: null,
        status: "generating",
        updatedAt: "2026-04-22T00:00:00.000Z",
        approvedAt: null,
        sourceTaskId: "task_20260422_scene_rain_dock_regen",
        storageDir:
          "projects/proj_1-my-story/scene-sheets/batches/scene_batch_v1/scenes/scene_rain_dock",
        currentImageRelPath:
          "scene-sheets/batches/scene_batch_v1/scenes/scene_rain_dock/current.png",
        currentMetadataRelPath:
          "scene-sheets/batches/scene_batch_v1/scenes/scene_rain_dock/current.json",
        promptGeneratedRelPath:
          "scene-sheets/batches/scene_batch_v1/scenes/scene_rain_dock/prompt.generated.txt",
        promptCurrentRelPath:
          "scene-sheets/batches/scene_batch_v1/scenes/scene_rain_dock/prompt.current.txt",
        promptVariablesRelPath:
          "scene-sheets/batches/scene_batch_v1/scenes/scene_rain_dock/prompt.variables.json",
        imagePromptRelPath:
          "scene-sheets/batches/scene_batch_v1/scenes/scene_rain_dock/image-prompt.txt",
        versionsStorageDir:
          "scene-sheets/batches/scene_batch_v1/scenes/scene_rain_dock/versions",
      }),
      updateScene: vi.fn(),
    };
    const sceneSheetStorage = {
      writeBatchManifest: vi.fn(),
      writeGeneratedPrompt: vi.fn(),
      writeImageVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      readPromptTemplate: vi.fn().mockResolvedValue("{{promptTextCurrent}}"),
    };
    const imageProvider = {
      generateShotImage: vi.fn().mockResolvedValue({
        imageBytes: new Uint8Array([1, 2, 3]),
        width: 1536,
        height: 1024,
        rawResponse: '{"image":"ok"}',
        provider: "mock-image-provider",
        model: "scene-v1",
      }),
    };
    const useCase = createProcessSceneSheetGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      sceneSheetRepository,
      sceneSheetStorage,
      shotImageProvider: imageProvider,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-04-22T00:01:00.000Z")
          .mockReturnValueOnce("2026-04-22T00:02:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_20260422_scene_rain_dock_regen" });

    expect(imageProvider.generateShotImage).toHaveBeenCalledWith({
      projectId: "proj_1",
      frameId: "scene_rain_dock",
      promptText: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影，湿滑地面积水，远处吊机剪影。",
      negativePromptText: null,
      referenceImagePaths: [],
    });
    expect(sceneSheetStorage.writeCurrentImage).toHaveBeenCalledWith({
      scene: expect.objectContaining({ id: "scene_rain_dock" }),
      imageBytes: new Uint8Array([1, 2, 3]),
      metadata: expect.objectContaining({
        width: 1536,
        height: 1024,
        provider: "mock-image-provider",
        model: "scene-v1",
      }),
    });
    expect(sceneSheetRepository.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "scene_rain_dock",
        imageAssetPath:
          "scene-sheets/batches/scene_batch_v1/scenes/scene_rain_dock/current.png",
        status: "in_review",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "mock-image-provider",
        model: "scene-v1",
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "scene_sheets_in_review",
      updatedAt: "2026-04-22T00:02:00.000Z",
    });
    expect(taskRepository.markSucceeded).toHaveBeenCalledWith({
      taskId: "task_20260422_scene_rain_dock_regen",
      updatedAt: "2026-04-22T00:02:00.000Z",
      finishedAt: "2026-04-22T00:02:00.000Z",
    });
  });

  it("throws when the task does not exist", async () => {
    const useCase = createProcessSceneSheetGenerateTaskUseCase({
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
      shotImageProvider: { generateShotImage: vi.fn() },
      clock: { now: vi.fn() },
    });

    await expect(useCase.execute({ taskId: "missing-task" })).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
  });

  it("throws when the owning project does not exist", async () => {
    const useCase = createProcessSceneSheetGenerateTaskUseCase({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_20260422_scene_rain_dock_regen",
          projectId: "proj_1",
          type: "scene_sheet_generate",
          status: "pending",
          queueName: "scene-sheet-generate",
          storageDir: "projects/proj_1-my-story/tasks/task_20260422_scene_rain_dock_regen",
          inputRelPath: "tasks/task_20260422_scene_rain_dock_regen/input.json",
          outputRelPath: "tasks/task_20260422_scene_rain_dock_regen/output.json",
          logRelPath: "tasks/task_20260422_scene_rain_dock_regen/log.txt",
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
          taskId: "task_20260422_scene_rain_dock_regen",
          projectId: "proj_1",
          taskType: "scene_sheet_generate",
          batchId: "scene_batch_v1",
          sceneId: "scene_rain_dock",
          sourceMasterPlotId: "mp_1",
          sourceCharacterSheetBatchId: "char_batch_v1",
          sceneName: "暴雨码头",
          scenePurpose: "故事开场的核心外部环境。",
          promptTextCurrent: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
          constraintsText: "保持码头结构、远处吊机轮廓、暴雨夜氛围。",
          imagePromptTemplateKey: "scene_sheet.generate",
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
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
      shotImageProvider: { generateShotImage: vi.fn() },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-04-22T00:01:00.000Z")
          .mockReturnValueOnce("2026-04-22T00:02:00.000Z"),
      },
    });

    await expect(
      useCase.execute({ taskId: "task_20260422_scene_rain_dock_regen" }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
