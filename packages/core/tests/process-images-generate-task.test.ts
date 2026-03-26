import { describe, expect, it, vi } from "vitest";

import {
  TaskNotFoundError,
  createProcessImagesGenerateTaskUseCase,
} from "../src/index";

describe("process images generate task use case", () => {
  it("creates one shot record per shot and only enqueues required frame prompt tasks", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260324_images",
        projectId: "proj_20260324_ab12cd",
        type: "images_generate",
        status: "pending",
        queueName: "images-generate",
        storageDir: "projects/proj_20260324_ab12cd-my-story/tasks/task_20260324_images",
        inputRelPath: "tasks/task_20260324_images/input.json",
        outputRelPath: "tasks/task_20260324_images/output.json",
        logRelPath: "tasks/task_20260324_images/log.txt",
        errorMessage: null,
        createdAt: "2026-03-24T00:11:00.000Z",
        updatedAt: "2026-03-24T00:11:00.000Z",
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
        id: "proj_20260324_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260324_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "master_plot_v1",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_v1",
        currentShotScriptId: "shot_script_v1",
        currentImageBatchId: null,
        status: "images_generating",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:11:00.000Z",
        premiseUpdatedAt: "2026-03-24T00:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_20260324_images",
        projectId: "proj_20260324_ab12cd",
        taskType: "images_generate",
        sourceShotScriptId: "shot_script_v1",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotScriptStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeShotScriptVersion: vi.fn(),
      readShotScriptVersion: vi.fn(),
      writeCurrentShotScript: vi.fn(),
      readCurrentShotScript: vi.fn().mockResolvedValue({
        id: "shot_script_v1",
        title: "Episode 1 Shot Script",
        sourceStoryboardId: "storyboard_v1",
        sourceTaskId: "task_shot_script",
        updatedAt: "2026-03-24T00:10:00.000Z",
        approvedAt: "2026-03-24T00:10:00.000Z",
        segmentCount: 2,
        shotCount: 3,
        totalDurationSec: 12,
        segments: [
          {
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            name: "集市压境",
            summary: "林夏确认对手已经堵住出口。",
            durationSec: 6,
            status: "approved",
            lastGeneratedAt: "2026-03-24T00:09:00.000Z",
            approvedAt: "2026-03-24T00:10:00.000Z",
            shots: [
              {
                id: "shot_1",
                sceneId: "scene_1",
                segmentId: "segment_1",
                order: 1,
                shotCode: "S01-SG01-SH01",
                durationSec: 3,
                purpose: "交代堵路。",
                visual: "清晨积水集市入口。",
                subject: "林夏",
                action: "她停住脚步。",
                frameDependency: "start_frame_only",
                dialogue: null,
                os: "来得比我还快。",
                audio: "雨声与水声。",
                transitionHint: null,
                continuityNotes: null,
              },
            ],
          },
          {
            segmentId: "segment_2",
            sceneId: "scene_1",
            order: 2,
            name: "退路消失",
            summary: "林夏回头，发现身后也被摊棚堵死。",
            durationSec: 6,
            status: "approved",
            lastGeneratedAt: "2026-03-24T00:09:00.000Z",
            approvedAt: "2026-03-24T00:10:00.000Z",
            shots: [
              {
                id: "shot_2",
                sceneId: "scene_1",
                segmentId: "segment_2",
                order: 1,
                shotCode: "S01-SG02-SH01",
                durationSec: 3,
                purpose: "交代退路也被封死。",
                visual: "身后摊棚倒向水线。",
                subject: "林夏",
                action: "她猛然回头。",
                frameDependency: "start_and_end_frame",
                dialogue: null,
                os: null,
                audio: "棚布拍打声。",
                transitionHint: null,
                continuityNotes: null,
              },
            ],
          },
        ],
      }),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      listShotsByBatchId: vi.fn(),
      insertFrame: vi.fn(),
      insertShot: vi.fn(),
      findFrameById: vi.fn(),
      findShotById: vi.fn(),
      updateFrame: vi.fn(),
      updateShot: vi.fn(),
    };
    const shotImageStorage = {
      writeBatchManifest: vi.fn(),
      writeFramePlanning: vi.fn(),
      writeFramePromptFiles: vi.fn(),
      writeFramePromptVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      writeImageVersion: vi.fn(),
      readCurrentFrame: vi.fn(),
      resolveProjectAssetPath: vi.fn(),
    };
    const taskQueue = { enqueue: vi.fn() };

    const useCase = createProcessImagesGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotScriptStorage,
      shotImageRepository,
      shotImageStorage,
      taskQueue,
      taskIdGenerator: {
        generateTaskId: vi
          .fn()
          .mockReturnValueOnce("task_frame_prompt_1")
          .mockReturnValueOnce("task_frame_prompt_2")
          .mockReturnValueOnce("task_frame_prompt_3"),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-24T00:12:00.000Z")
          .mockReturnValueOnce("2026-03-24T00:13:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_20260324_images" });

    expect(taskRepository.markRunning).toHaveBeenCalledWith({
      taskId: "task_20260324_images",
      updatedAt: "2026-03-24T00:12:00.000Z",
      startedAt: "2026-03-24T00:12:00.000Z",
    });
    expect(shotImageRepository.insertBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "image_batch_task_20260324_images",
        sourceShotScriptId: "shot_script_v1",
        shotCount: 2,
        totalRequiredFrameCount: 3,
      }),
    );
    expect(shotImageRepository.insertShot).toHaveBeenCalledTimes(2);
    expect(shotImageRepository.insertShot).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        shotId: "shot_1",
        frameDependency: "start_frame_only",
        endFrame: null,
      }),
    );
    expect(shotImageRepository.insertShot).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        shotId: "shot_2",
        frameDependency: "start_and_end_frame",
        endFrame: expect.objectContaining({
          frameType: "end_frame",
        }),
      }),
    );
    expect(shotImageStorage.writeBatchManifest).toHaveBeenCalledTimes(1);
    expect(projectRepository.updateCurrentImageBatch).toHaveBeenCalledWith({
      projectId: "proj_20260324_ab12cd",
      batchId: "image_batch_task_20260324_images",
    });
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledTimes(3);
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        input: expect.objectContaining({
          taskType: "frame_prompt_generate",
          segmentId: "segment_1",
          shotId: "shot_1",
          frameType: "start_frame",
        }),
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        input: expect.objectContaining({
          taskType: "frame_prompt_generate",
          segmentId: "segment_2",
          shotId: "shot_2",
          frameType: "start_frame",
        }),
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        input: expect.objectContaining({
          taskType: "frame_prompt_generate",
          segmentId: "segment_2",
          shotId: "shot_2",
          frameType: "end_frame",
        }),
      }),
    );
    expect(taskQueue.enqueue).toHaveBeenCalledTimes(3);
    expect(taskFileStorage.writeTaskOutput).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_20260324_images" }),
      output: {
        batchId: "image_batch_task_20260324_images",
        frameCount: 3,
      },
    });
    expect(taskRepository.markSucceeded).toHaveBeenCalledWith({
      taskId: "task_20260324_images",
      updatedAt: "2026-03-24T00:13:00.000Z",
      finishedAt: "2026-03-24T00:13:00.000Z",
    });
  });

  it("throws when the task does not exist", async () => {
    const useCase = createProcessImagesGenerateTaskUseCase({
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
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn(),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn(),
      },
      shotImageRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        findCurrentBatchByProjectId: vi.fn(),
        listFramesByBatchId: vi.fn(),
        insertFrame: vi.fn(),
        findFrameById: vi.fn(),
        updateFrame: vi.fn(),
      },
      shotImageStorage: {
        writeBatchManifest: vi.fn(),
        writeFramePlanning: vi.fn(),
        writeFramePromptFiles: vi.fn(),
        writeFramePromptVersion: vi.fn(),
        writeCurrentImage: vi.fn(),
        writeImageVersion: vi.fn(),
        readCurrentFrame: vi.fn(),
        resolveProjectAssetPath: vi.fn(),
      },
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: { generateTaskId: vi.fn() },
      clock: { now: vi.fn() },
    });

    await expect(useCase.execute({ taskId: "missing-task" })).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
  });

  it("creates unique shot ids and storage paths when raw shot ids repeat across scenes", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260324_images_dup",
        projectId: "proj_20260324_ab12cd",
        type: "images_generate",
        status: "pending",
        queueName: "images-generate",
        storageDir: "projects/proj_20260324_ab12cd-my-story/tasks/task_20260324_images_dup",
        inputRelPath: "tasks/task_20260324_images_dup/input.json",
        outputRelPath: "tasks/task_20260324_images_dup/output.json",
        logRelPath: "tasks/task_20260324_images_dup/log.txt",
        errorMessage: null,
        createdAt: "2026-03-24T00:11:00.000Z",
        updatedAt: "2026-03-24T00:11:00.000Z",
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
        id: "proj_20260324_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260324_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "master_plot_v1",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_v1",
        currentShotScriptId: "shot_script_v1",
        currentImageBatchId: null,
        status: "images_generating",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:11:00.000Z",
        premiseUpdatedAt: "2026-03-24T00:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_20260324_images_dup",
        projectId: "proj_20260324_ab12cd",
        taskType: "images_generate",
        sourceShotScriptId: "shot_script_v1",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotScriptStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeShotScriptVersion: vi.fn(),
      readShotScriptVersion: vi.fn(),
      writeCurrentShotScript: vi.fn(),
      readCurrentShotScript: vi.fn().mockResolvedValue({
        id: "shot_script_v1",
        title: "Episode 1 Shot Script",
        sourceStoryboardId: "storyboard_v1",
        sourceTaskId: "task_shot_script",
        updatedAt: "2026-03-24T00:10:00.000Z",
        approvedAt: "2026-03-24T00:10:00.000Z",
        segmentCount: 2,
        shotCount: 2,
        totalDurationSec: 11,
        segments: [
          {
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            name: "第一场",
            summary: "第一场。",
            durationSec: 6,
            status: "approved",
            lastGeneratedAt: "2026-03-24T00:09:00.000Z",
            approvedAt: "2026-03-24T00:10:00.000Z",
            shots: [
              {
                id: "shot_dup",
                sceneId: "scene_1",
                segmentId: "segment_1",
                order: 1,
                shotCode: "S01-SG01-SH01",
                durationSec: 3,
                purpose: "第一镜头。",
                visual: "第一场镜头。",
                subject: "林夏",
                action: "她看向前方。",
                frameDependency: "start_frame_only",
                dialogue: null,
                os: null,
                audio: "水声。",
                transitionHint: null,
                continuityNotes: null,
              },
            ],
          },
          {
            segmentId: "segment_1",
            sceneId: "scene_2",
            order: 1,
            name: "第二场",
            summary: "第二场。",
            durationSec: 5,
            status: "approved",
            lastGeneratedAt: "2026-03-24T00:09:00.000Z",
            approvedAt: "2026-03-24T00:10:00.000Z",
            shots: [
              {
                id: "shot_dup",
                sceneId: "scene_2",
                segmentId: "segment_1",
                order: 1,
                shotCode: "S02-SG01-SH01",
                durationSec: 2,
                purpose: "第二镜头。",
                visual: "第二场镜头。",
                subject: "林夏",
                action: "她后退一步。",
                frameDependency: "start_frame_only",
                dialogue: null,
                os: null,
                audio: "风声。",
                transitionHint: null,
                continuityNotes: null,
              },
            ],
          },
        ],
      }),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      listShotsByBatchId: vi.fn(),
      insertFrame: vi.fn(),
      insertShot: vi.fn(),
      findFrameById: vi.fn(),
      findShotById: vi.fn(),
      updateFrame: vi.fn(),
      updateShot: vi.fn(),
    };
    const shotImageStorage = {
      writeBatchManifest: vi.fn(),
      writeFramePlanning: vi.fn(),
      writeFramePromptFiles: vi.fn(),
      writeFramePromptVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      writeImageVersion: vi.fn(),
      readCurrentFrame: vi.fn(),
      resolveProjectAssetPath: vi.fn(),
    };
    const taskQueue = { enqueue: vi.fn() };

    const useCase = createProcessImagesGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotScriptStorage,
      shotImageRepository,
      shotImageStorage,
      taskQueue,
      taskIdGenerator: {
        generateTaskId: vi
          .fn()
          .mockReturnValueOnce("task_frame_prompt_dup_1")
          .mockReturnValueOnce("task_frame_prompt_dup_2"),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-24T00:12:00.000Z")
          .mockReturnValueOnce("2026-03-24T00:13:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_20260324_images_dup" });

    const insertedShots = shotImageRepository.insertShot.mock.calls.map((call) => call[0]);
    const shotIds = insertedShots.map((shot: { id: string }) => shot.id);
    const storageDirs = insertedShots.map((shot: { storageDir: string }) => shot.storageDir);

    expect(new Set(shotIds).size).toBe(2);
    expect(new Set(storageDirs).size).toBe(2);
  });

  it("creates different shot record ids for the same raw shot across separate image batches", async () => {
    const tasksById = new Map([
      [
        "task_20260324_images_first",
        {
          id: "task_20260324_images_first",
          projectId: "proj_20260324_ab12cd",
          type: "images_generate",
          status: "pending",
          queueName: "images-generate",
          storageDir:
            "projects/proj_20260324_ab12cd-my-story/tasks/task_20260324_images_first",
          inputRelPath: "tasks/task_20260324_images_first/input.json",
          outputRelPath: "tasks/task_20260324_images_first/output.json",
          logRelPath: "tasks/task_20260324_images_first/log.txt",
          errorMessage: null,
          createdAt: "2026-03-24T00:11:00.000Z",
          updatedAt: "2026-03-24T00:11:00.000Z",
          startedAt: null,
          finishedAt: null,
        },
      ],
      [
        "task_20260324_images_second",
        {
          id: "task_20260324_images_second",
          projectId: "proj_20260324_ab12cd",
          type: "images_generate",
          status: "pending",
          queueName: "images-generate",
          storageDir:
            "projects/proj_20260324_ab12cd-my-story/tasks/task_20260324_images_second",
          inputRelPath: "tasks/task_20260324_images_second/input.json",
          outputRelPath: "tasks/task_20260324_images_second/output.json",
          logRelPath: "tasks/task_20260324_images_second/log.txt",
          errorMessage: null,
          createdAt: "2026-03-24T00:14:00.000Z",
          updatedAt: "2026-03-24T00:14:00.000Z",
          startedAt: null,
          finishedAt: null,
        },
      ],
    ]);
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockImplementation(async (taskId: string) => tasksById.get(taskId) ?? null),
      findLatestByProjectId: vi.fn(),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260324_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260324_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "master_plot_v1",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_v1",
        currentShotScriptId: "shot_script_v1",
        currentImageBatchId: null,
        status: "images_generating",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:11:00.000Z",
        premiseUpdatedAt: "2026-03-24T00:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi
        .fn()
        .mockResolvedValueOnce({
          taskId: "task_20260324_images_first",
          projectId: "proj_20260324_ab12cd",
          taskType: "images_generate",
          sourceShotScriptId: "shot_script_v1",
        })
        .mockResolvedValueOnce({
          taskId: "task_20260324_images_second",
          projectId: "proj_20260324_ab12cd",
          taskType: "images_generate",
          sourceShotScriptId: "shot_script_v1",
        }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotScriptStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeShotScriptVersion: vi.fn(),
      readShotScriptVersion: vi.fn(),
      writeCurrentShotScript: vi.fn(),
      readCurrentShotScript: vi.fn().mockResolvedValue({
        id: "shot_script_v1",
        title: "Episode 1 Shot Script",
        sourceStoryboardId: "storyboard_v1",
        sourceTaskId: "task_shot_script",
        updatedAt: "2026-03-24T00:10:00.000Z",
        approvedAt: "2026-03-24T00:10:00.000Z",
        segmentCount: 1,
        shotCount: 1,
        totalDurationSec: 6,
        segments: [
          {
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            name: "第一场",
            summary: "第一场。",
            durationSec: 6,
            status: "approved",
            lastGeneratedAt: "2026-03-24T00:09:00.000Z",
            approvedAt: "2026-03-24T00:10:00.000Z",
            shots: [
              {
                id: "shot_1",
                sceneId: "scene_1",
                segmentId: "segment_1",
                order: 1,
                shotCode: "S01-SG01-SH01",
                durationSec: 6,
                purpose: "第一镜头。",
                visual: "第一场。",
                subject: "林夏",
                action: "她转身。",
                frameDependency: "start_frame_only",
                dialogue: null,
                os: null,
                audio: "雨声。",
                transitionHint: null,
                continuityNotes: null,
              },
            ],
          },
        ],
      }),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      listShotsByBatchId: vi.fn(),
      insertFrame: vi.fn(),
      insertShot: vi.fn(),
      findFrameById: vi.fn(),
      findShotById: vi.fn(),
      updateFrame: vi.fn(),
      updateShot: vi.fn(),
    };
    const shotImageStorage = {
      writeBatchManifest: vi.fn(),
      writeFramePlanning: vi.fn(),
      writeFramePromptFiles: vi.fn(),
      writeFramePromptVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      writeImageVersion: vi.fn(),
      readCurrentFrame: vi.fn(),
      resolveProjectAssetPath: vi.fn(),
    };
    const taskQueue = { enqueue: vi.fn() };

    const useCase = createProcessImagesGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotScriptStorage,
      shotImageRepository,
      shotImageStorage,
      taskQueue,
      taskIdGenerator: {
        generateTaskId: vi
          .fn()
          .mockReturnValueOnce("task_frame_prompt_1")
          .mockReturnValueOnce("task_frame_prompt_2"),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-24T00:12:00.000Z")
          .mockReturnValueOnce("2026-03-24T00:13:00.000Z")
          .mockReturnValueOnce("2026-03-24T00:15:00.000Z")
          .mockReturnValueOnce("2026-03-24T00:16:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_20260324_images_first" });
    await useCase.execute({ taskId: "task_20260324_images_second" });

    const insertedShots = shotImageRepository.insertShot.mock.calls.map((call) => call[0]);
    const firstBatchShotIds = insertedShots.slice(0, 1).map((shot: { id: string }) => shot.id);
    const secondBatchShotIds = insertedShots.slice(1, 2).map((shot: { id: string }) => shot.id);

    expect(firstBatchShotIds).not.toEqual(secondBatchShotIds);
  });

  it("does not switch the current image batch when shot record creation fails", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260324_images_fail",
        projectId: "proj_20260324_ab12cd",
        type: "images_generate",
        status: "pending",
        queueName: "images-generate",
        storageDir: "projects/proj_20260324_ab12cd-my-story/tasks/task_20260324_images_fail",
        inputRelPath: "tasks/task_20260324_images_fail/input.json",
        outputRelPath: "tasks/task_20260324_images_fail/output.json",
        logRelPath: "tasks/task_20260324_images_fail/log.txt",
        errorMessage: null,
        createdAt: "2026-03-24T00:11:00.000Z",
        updatedAt: "2026-03-24T00:11:00.000Z",
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
        id: "proj_20260324_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260324_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "master_plot_v1",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_v1",
        currentShotScriptId: "shot_script_v1",
        currentImageBatchId: "image_batch_previous",
        status: "images_generating",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:11:00.000Z",
        premiseUpdatedAt: "2026-03-24T00:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_20260324_images_fail",
        projectId: "proj_20260324_ab12cd",
        taskType: "images_generate",
        sourceShotScriptId: "shot_script_v1",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotScriptStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeShotScriptVersion: vi.fn(),
      readShotScriptVersion: vi.fn(),
      writeCurrentShotScript: vi.fn(),
      readCurrentShotScript: vi.fn().mockResolvedValue({
        id: "shot_script_v1",
        title: "Episode 1 Shot Script",
        sourceStoryboardId: "storyboard_v1",
        sourceTaskId: "task_shot_script",
        updatedAt: "2026-03-24T00:10:00.000Z",
        approvedAt: "2026-03-24T00:10:00.000Z",
        segmentCount: 1,
        shotCount: 1,
        totalDurationSec: 6,
        segments: [
          {
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            name: "第一场",
            summary: "第一场。",
            durationSec: 6,
            status: "approved",
            lastGeneratedAt: "2026-03-24T00:09:00.000Z",
            approvedAt: "2026-03-24T00:10:00.000Z",
            shots: [
              {
                id: "shot_1",
                sceneId: "scene_1",
                segmentId: "segment_1",
                order: 1,
                shotCode: "S01-SG01-SH01",
                durationSec: 6,
                purpose: "第一镜头。",
                visual: "第一场。",
                subject: "林夏",
                action: "她抬头。",
                frameDependency: "start_frame_only",
                dialogue: null,
                os: null,
                audio: "雨声。",
                transitionHint: null,
                continuityNotes: null,
              },
            ],
          },
        ],
      }),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      listShotsByBatchId: vi.fn(),
      insertFrame: vi.fn(),
      insertShot: vi.fn().mockImplementation(() => {
        throw new Error("shot insert failed");
      }),
      findFrameById: vi.fn(),
      findShotById: vi.fn(),
      updateFrame: vi.fn(),
      updateShot: vi.fn(),
    };
    const shotImageStorage = {
      writeBatchManifest: vi.fn(),
      writeFramePlanning: vi.fn(),
      writeFramePromptFiles: vi.fn(),
      writeFramePromptVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      writeImageVersion: vi.fn(),
      readCurrentFrame: vi.fn(),
      resolveProjectAssetPath: vi.fn(),
    };
    const taskQueue = { enqueue: vi.fn() };

    const useCase = createProcessImagesGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotScriptStorage,
      shotImageRepository,
      shotImageStorage,
      taskQueue,
      taskIdGenerator: {
        generateTaskId: vi.fn(),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-24T00:12:00.000Z")
          .mockReturnValueOnce("2026-03-24T00:13:00.000Z"),
      },
    });

    await expect(useCase.execute({ taskId: "task_20260324_images_fail" })).rejects.toThrow(
      "shot insert failed",
    );

    expect(projectRepository.updateCurrentImageBatch).not.toHaveBeenCalled();
  });
});
