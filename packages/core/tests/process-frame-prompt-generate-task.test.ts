import { describe, expect, it, vi } from "vitest";

import {
  createProcessFramePromptGenerateTaskUseCase,
} from "../src/index";

describe("process frame prompt generate task use case", () => {
  it("filters unknown planner ids, degrades missing reference images, and persists editable prompt fields", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_frame_prompt_1",
        projectId: "proj_20260324_ab12cd",
        type: "frame_prompt_generate",
        status: "pending",
        queueName: "frame-prompt-generate",
        storageDir: "projects/proj_20260324_ab12cd-my-story/tasks/task_frame_prompt_1",
        inputRelPath: "tasks/task_frame_prompt_1/input.json",
        outputRelPath: "tasks/task_frame_prompt_1/output.json",
        logRelPath: "tasks/task_frame_prompt_1/log.txt",
        errorMessage: null,
        createdAt: "2026-03-24T00:12:00.000Z",
        updatedAt: "2026-03-24T00:12:00.000Z",
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
        currentImageBatchId: "image_batch_task_20260324_images",
        status: "images_generating",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:12:00.000Z",
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
        taskId: "task_frame_prompt_1",
        projectId: "proj_20260324_ab12cd",
        taskType: "frame_prompt_generate",
        batchId: "image_batch_task_20260324_images",
        frameId: "frame_segment_1_start",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        frameType: "start_frame",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      insertFrame: vi.fn(),
      findFrameById: vi.fn().mockResolvedValue({
        id: "frame_segment_1_start",
        batchId: "image_batch_task_20260324_images",
        projectId: "proj_20260324_ab12cd",
        projectStorageDir: "projects/proj_20260324_ab12cd-my-story",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        frameType: "start_frame",
        planStatus: "pending",
        imageStatus: "pending",
        selectedCharacterIds: [],
        matchedReferenceImagePaths: [],
        unmatchedCharacterIds: [],
        promptTextSeed: "",
        promptTextCurrent: "",
        negativePromptTextCurrent: null,
        promptUpdatedAt: null,
        imageAssetPath: null,
        imageWidth: null,
        imageHeight: null,
        provider: null,
        model: null,
        approvedAt: null,
        updatedAt: "2026-03-24T00:12:00.000Z",
        sourceTaskId: null,
        storageDir:
          "projects/proj_20260324_ab12cd-my-story/images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame",
        planningRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/planning.json",
        promptSeedRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/prompt.seed.txt",
        promptCurrentRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/prompt.current.txt",
        currentImageRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/current.png",
        currentMetadataRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/current.json",
        promptVersionsStorageDir:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/prompt.versions",
        versionsStorageDir:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/start-frame/versions",
      }),
      updateFrame: vi.fn(),
    };
    const shotImageStorage = {
      writeBatchManifest: vi.fn(),
      writeFramePlanning: vi.fn(),
      writeFramePromptFiles: vi.fn(),
      writeFramePromptVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      writeImageVersion: vi.fn(),
      readCurrentFrame: vi.fn(),
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
                dialogue: null,
                os: "来得比我还快。",
                audio: "雨声与水声。",
                transitionHint: null,
                continuityNotes: null,
              },
            ],
          },
        ],
      }),
    };
    const characterSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      listCharactersByBatchId: vi.fn().mockResolvedValue([
        { id: "char_rin", status: "approved" },
        { id: "char_ivo", status: "approved" },
        { id: "char_unapproved", status: "in_review" },
      ]),
      insertCharacter: vi.fn(),
      findCharacterById: vi.fn(),
      updateCharacter: vi.fn(),
    };
    const characterSheetStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeGeneratedPrompt: vi.fn(),
      writeImageVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      readCurrentCharacterSheet: vi
        .fn()
        .mockResolvedValueOnce({
          id: "char_rin",
          projectId: "proj_20260324_ab12cd",
          batchId: "char_batch_v1",
          sourceMasterPlotId: "master_plot_v1",
          characterName: "林夏",
          promptTextGenerated: "银色飞行夹克",
          promptTextCurrent: "银色飞行夹克，湿透衣角",
          referenceImages: [],
          imageAssetPath: "projects/proj_20260324_ab12cd-my-story/character-sheets/char_rin/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
          provider: "vector-engine",
          model: "turnaround-v1",
          status: "approved",
          updatedAt: "2026-03-24T00:08:00.000Z",
          approvedAt: "2026-03-24T00:09:00.000Z",
          sourceTaskId: "task_char_rin",
        })
        .mockResolvedValueOnce({
          id: "char_ivo",
          projectId: "proj_20260324_ab12cd",
          batchId: "char_batch_v1",
          sourceMasterPlotId: "master_plot_v1",
          characterName: "伊沃",
          promptTextGenerated: "机修工围裙",
          promptTextCurrent: "机修工围裙，油污手套",
          referenceImages: [],
          imageAssetPath: null,
          imageWidth: null,
          imageHeight: null,
          provider: null,
          model: null,
          status: "approved",
          updatedAt: "2026-03-24T00:08:00.000Z",
          approvedAt: "2026-03-24T00:09:00.000Z",
          sourceTaskId: "task_char_ivo",
        }),
      listReferenceImages: vi.fn(),
      saveReferenceImages: vi.fn(),
      deleteReferenceImage: vi.fn(),
      getReferenceImageContent: vi.fn(),
      getImageContent: vi.fn(),
      resolveReferenceImagePaths: vi.fn(),
    };
    const framePromptProvider = {
      generateFramePrompt: vi.fn().mockResolvedValue({
        frameType: "start_frame",
        selectedCharacterIds: ["char_rin", "char_unknown", "char_ivo"],
        promptText: "清晨积水集市入口，林夏停在水线前，电影感构图。",
        negativePromptText: "模糊，低清晰度",
        rationale: "起始帧应突出林夏与入口堵路的关系。",
        rawResponse: '{"selectedCharacterIds":["char_rin","char_unknown","char_ivo"]}',
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
      }),
    };

    const useCase = createProcessFramePromptGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotImageRepository,
      shotImageStorage,
      shotScriptStorage,
      characterSheetRepository,
      characterSheetStorage,
      framePromptProvider,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-24T00:14:00.000Z")
          .mockReturnValueOnce("2026-03-24T00:15:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_frame_prompt_1" });

    expect(shotImageRepository.updateFrame).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "frame_segment_1_start",
        planStatus: "planned",
        selectedCharacterIds: ["char_rin", "char_ivo"],
        matchedReferenceImagePaths: [
          "projects/proj_20260324_ab12cd-my-story/character-sheets/char_rin/current.png",
        ],
        unmatchedCharacterIds: ["char_ivo"],
        promptTextSeed: "清晨积水集市入口，林夏停在水线前，电影感构图。",
        promptTextCurrent: "清晨积水集市入口，林夏停在水线前，电影感构图。",
        negativePromptTextCurrent: "模糊，低清晰度",
        promptUpdatedAt: "2026-03-24T00:15:00.000Z",
        sourceTaskId: "task_frame_prompt_1",
      }),
    );
    expect(shotImageStorage.writeFramePlanning).toHaveBeenCalledTimes(1);
    expect(shotImageStorage.writeFramePromptFiles).toHaveBeenCalledTimes(1);
    expect(taskFileStorage.writeTaskOutput).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_frame_prompt_1" }),
      output: {
        frameId: "frame_segment_1_start",
        selectedCharacterIds: ["char_rin", "char_ivo"],
        matchedReferenceImagePaths: [
          "projects/proj_20260324_ab12cd-my-story/character-sheets/char_rin/current.png",
        ],
        unmatchedCharacterIds: ["char_ivo"],
      },
    });
    expect(taskRepository.markSucceeded).toHaveBeenCalledWith({
      taskId: "task_frame_prompt_1",
      updatedAt: "2026-03-24T00:15:00.000Z",
      finishedAt: "2026-03-24T00:15:00.000Z",
    });
  });

  it("uses the matching scene segment when raw segment ids repeat", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_frame_prompt_2",
        projectId: "proj_20260324_ab12cd",
        type: "frame_prompt_generate",
        status: "pending",
        queueName: "frame-prompt-generate",
        storageDir: "projects/proj_20260324_ab12cd-my-story/tasks/task_frame_prompt_2",
        inputRelPath: "tasks/task_frame_prompt_2/input.json",
        outputRelPath: "tasks/task_frame_prompt_2/output.json",
        logRelPath: "tasks/task_frame_prompt_2/log.txt",
        errorMessage: null,
        createdAt: "2026-03-24T00:12:00.000Z",
        updatedAt: "2026-03-24T00:12:00.000Z",
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
        currentImageBatchId: "image_batch_task_20260324_images",
        status: "images_generating",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:12:00.000Z",
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
        taskId: "task_frame_prompt_2",
        projectId: "proj_20260324_ab12cd",
        taskType: "frame_prompt_generate",
        batchId: "image_batch_task_20260324_images",
        frameId: "frame_scene_2__segment_1_start",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_2",
        frameType: "start_frame",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      insertFrame: vi.fn(),
      findFrameById: vi.fn().mockResolvedValue({
        id: "frame_scene_2__segment_1_start",
        batchId: "image_batch_task_20260324_images",
        projectId: "proj_20260324_ab12cd",
        projectStorageDir: "projects/proj_20260324_ab12cd-my-story",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_2",
        order: 1,
        frameType: "start_frame",
        planStatus: "pending",
        imageStatus: "pending",
        selectedCharacterIds: [],
        matchedReferenceImagePaths: [],
        unmatchedCharacterIds: [],
        promptTextSeed: "",
        promptTextCurrent: "",
        negativePromptTextCurrent: null,
        promptUpdatedAt: null,
        imageAssetPath: null,
        imageWidth: null,
        imageHeight: null,
        provider: null,
        model: null,
        approvedAt: null,
        updatedAt: "2026-03-24T00:12:00.000Z",
        sourceTaskId: null,
        storageDir:
          "projects/proj_20260324_ab12cd-my-story/images/batches/image_batch_task_20260324_images/segments/scene_2__segment_1/start-frame",
        planningRelPath:
          "images/batches/image_batch_task_20260324_images/segments/scene_2__segment_1/start-frame/planning.json",
        promptSeedRelPath:
          "images/batches/image_batch_task_20260324_images/segments/scene_2__segment_1/start-frame/prompt.seed.txt",
        promptCurrentRelPath:
          "images/batches/image_batch_task_20260324_images/segments/scene_2__segment_1/start-frame/prompt.current.txt",
        currentImageRelPath:
          "images/batches/image_batch_task_20260324_images/segments/scene_2__segment_1/start-frame/current.png",
        currentMetadataRelPath:
          "images/batches/image_batch_task_20260324_images/segments/scene_2__segment_1/start-frame/current.json",
        promptVersionsStorageDir:
          "images/batches/image_batch_task_20260324_images/segments/scene_2__segment_1/start-frame/prompt.versions",
        versionsStorageDir:
          "images/batches/image_batch_task_20260324_images/segments/scene_2__segment_1/start-frame/versions",
      }),
      updateFrame: vi.fn(),
    };
    const shotImageStorage = {
      writeBatchManifest: vi.fn(),
      writeFramePlanning: vi.fn(),
      writeFramePromptFiles: vi.fn(),
      writeFramePromptVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      writeImageVersion: vi.fn(),
      readCurrentFrame: vi.fn(),
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
            summary: "第一场摘要。",
            durationSec: 6,
            status: "approved",
            lastGeneratedAt: "2026-03-24T00:09:00.000Z",
            approvedAt: "2026-03-24T00:10:00.000Z",
            shots: [],
          },
          {
            segmentId: "segment_1",
            sceneId: "scene_2",
            order: 1,
            name: "第二场",
            summary: "第二场摘要。",
            durationSec: 5,
            status: "approved",
            lastGeneratedAt: "2026-03-24T00:09:00.000Z",
            approvedAt: "2026-03-24T00:10:00.000Z",
            shots: [
              {
                id: "shot_scene_2",
                sceneId: "scene_2",
                segmentId: "segment_1",
                order: 1,
                shotCode: "S02-SG01-SH01",
                durationSec: 5,
                purpose: "第二场。",
                visual: "第二场画面。",
                subject: "林夏",
                action: "回头。",
                dialogue: null,
                os: null,
                audio: "广播杂音。",
                transitionHint: null,
                continuityNotes: null,
              },
            ],
          },
        ],
      }),
    };
    const characterSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      listCharactersByBatchId: vi.fn().mockResolvedValue([]),
      insertCharacter: vi.fn(),
      findCharacterById: vi.fn(),
      updateCharacter: vi.fn(),
    };
    const characterSheetStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeGeneratedPrompt: vi.fn(),
      writeImageVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      readCurrentCharacterSheet: vi.fn(),
      listReferenceImages: vi.fn(),
      saveReferenceImages: vi.fn(),
      deleteReferenceImage: vi.fn(),
      getReferenceImageContent: vi.fn(),
      getImageContent: vi.fn(),
      resolveReferenceImagePaths: vi.fn(),
    };
    const framePromptProvider = {
      generateFramePrompt: vi.fn().mockResolvedValue({
        frameType: "start_frame",
        selectedCharacterIds: [],
        promptText: "第二场起始帧提示词。",
        negativePromptText: null,
        rationale: "聚焦第二场。",
        rawResponse: "{}",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
      }),
    };

    const useCase = createProcessFramePromptGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotImageRepository,
      shotImageStorage,
      shotScriptStorage,
      characterSheetRepository,
      characterSheetStorage,
      framePromptProvider,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-24T00:14:00.000Z")
          .mockReturnValueOnce("2026-03-24T00:15:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_frame_prompt_2" });

    expect(framePromptProvider.generateFramePrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        segment: expect.objectContaining({
          sceneId: "scene_2",
          summary: "第二场摘要。",
          shots: [expect.objectContaining({ shotCode: "S02-SG01-SH01" })],
        }),
      }),
    );
  });

  it("marks the frame plan as failed when prompt generation fails so regeneration stays available", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_frame_prompt_3",
        projectId: "proj_20260324_ab12cd",
        type: "frame_prompt_generate",
        status: "pending",
        queueName: "frame-prompt-generate",
        storageDir: "projects/proj_20260324_ab12cd-my-story/tasks/task_frame_prompt_3",
        inputRelPath: "tasks/task_frame_prompt_3/input.json",
        outputRelPath: "tasks/task_frame_prompt_3/output.json",
        logRelPath: "tasks/task_frame_prompt_3/log.txt",
        errorMessage: null,
        createdAt: "2026-03-24T00:12:00.000Z",
        updatedAt: "2026-03-24T00:12:00.000Z",
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
        currentImageBatchId: "image_batch_task_20260324_images",
        status: "images_generating",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:12:00.000Z",
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
        taskId: "task_frame_prompt_3",
        projectId: "proj_20260324_ab12cd",
        taskType: "frame_prompt_generate",
        batchId: "image_batch_task_20260324_images",
        frameId: "frame_segment_1_end",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        frameType: "end_frame",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      insertFrame: vi.fn(),
      findFrameById: vi.fn().mockResolvedValue({
        id: "frame_segment_1_end",
        batchId: "image_batch_task_20260324_images",
        projectId: "proj_20260324_ab12cd",
        projectStorageDir: "projects/proj_20260324_ab12cd-my-story",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        frameType: "end_frame",
        planStatus: "pending",
        imageStatus: "pending",
        selectedCharacterIds: [],
        matchedReferenceImagePaths: [],
        unmatchedCharacterIds: [],
        promptTextSeed: "",
        promptTextCurrent: "",
        negativePromptTextCurrent: null,
        promptUpdatedAt: null,
        imageAssetPath: null,
        imageWidth: null,
        imageHeight: null,
        provider: null,
        model: null,
        approvedAt: null,
        updatedAt: "2026-03-24T00:12:00.000Z",
        sourceTaskId: null,
        storageDir:
          "projects/proj_20260324_ab12cd-my-story/images/batches/image_batch_task_20260324_images/segments/segment_1/end-frame",
        planningRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/end-frame/planning.json",
        promptSeedRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/end-frame/prompt.seed.txt",
        promptCurrentRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/end-frame/prompt.current.txt",
        currentImageRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/end-frame/current.png",
        currentMetadataRelPath:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/end-frame/current.json",
        promptVersionsStorageDir:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/end-frame/prompt.versions",
        versionsStorageDir:
          "images/batches/image_batch_task_20260324_images/segments/segment_1/end-frame/versions",
      }),
      updateFrame: vi.fn(),
    };
    const shotImageStorage = {
      writeBatchManifest: vi.fn(),
      writeFramePlanning: vi.fn(),
      writeFramePromptFiles: vi.fn(),
      writeFramePromptVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      writeImageVersion: vi.fn(),
      readCurrentFrame: vi.fn(),
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
            name: "集市压境",
            summary: "林夏确认对手已经堵住出口。",
            durationSec: 6,
            status: "approved",
            lastGeneratedAt: "2026-03-24T00:09:00.000Z",
            approvedAt: "2026-03-24T00:10:00.000Z",
            shots: [],
          },
        ],
      }),
    };
    const characterSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      listCharactersByBatchId: vi.fn().mockResolvedValue([]),
      insertCharacter: vi.fn(),
      findCharacterById: vi.fn(),
      updateCharacter: vi.fn(),
    };
    const characterSheetStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeGeneratedPrompt: vi.fn(),
      writeImageVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      readCurrentCharacterSheet: vi.fn(),
      listReferenceImages: vi.fn(),
      saveReferenceImages: vi.fn(),
      deleteReferenceImage: vi.fn(),
      getReferenceImageContent: vi.fn(),
      getImageContent: vi.fn(),
      resolveReferenceImagePaths: vi.fn(),
    };
    const framePromptProvider = {
      generateFramePrompt: vi.fn().mockRejectedValue(new Error("VectorEngine Gemini 503")),
    };

    const useCase = createProcessFramePromptGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotImageRepository,
      shotImageStorage,
      shotScriptStorage,
      characterSheetRepository,
      characterSheetStorage,
      framePromptProvider,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-24T00:14:00.000Z")
          .mockReturnValueOnce("2026-03-24T00:15:00.000Z"),
      },
    });

    await expect(useCase.execute({ taskId: "task_frame_prompt_3" })).rejects.toThrow(
      "VectorEngine Gemini 503",
    );

    expect(shotImageRepository.updateFrame).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "frame_segment_1_end",
        planStatus: "plan_failed",
        updatedAt: "2026-03-24T00:15:00.000Z",
      }),
    );
    expect(taskRepository.markFailed).toHaveBeenCalledWith({
      taskId: "task_frame_prompt_3",
      errorMessage: "VectorEngine Gemini 503",
      updatedAt: "2026-03-24T00:15:00.000Z",
      finishedAt: "2026-03-24T00:15:00.000Z",
    });
  });
});
