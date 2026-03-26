import { describe, expect, it, vi } from "vitest";

import { createProcessSegmentVideoGenerateTaskUseCase } from "../src/index";

describe("process segment video generate task use case", () => {
  it("renders the prompt, submits the provider job, persists current assets, and moves the project into videos_in_review", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_segment_video_1",
        projectId: "proj_1",
        type: "segment_video_generate",
        queueName: "segment-video-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_segment_video_1",
        inputRelPath: "tasks/task_segment_video_1/input.json",
        outputRelPath: "tasks/task_segment_video_1/output.json",
        logRelPath: "tasks/task_segment_video_1/log.txt",
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
        storageDir: "projects/proj_1-my-story",
        currentVideoBatchId: "video_batch_v1",
      }),
      listAll: vi.fn(),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateCurrentVideoBatch: vi.fn(),
      updateStatus: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_segment_video_1",
        projectId: "proj_1",
        taskType: "segment_video_generate",
        batchId: "video_batch_v1",
        sourceImageBatchId: "image_batch_v1",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        segment: {
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          name: "Arrival",
          summary: "Rin arrives at the flooded market.",
          durationSec: 8,
          status: "approved",
          lastGeneratedAt: "2026-03-25T00:09:00.000Z",
          approvedAt: "2026-03-25T00:10:00.000Z",
          shots: [
            {
              id: "shot_1",
              sceneId: "scene_1",
              segmentId: "segment_1",
              order: 1,
              shotCode: "S01-SG01",
              durationSec: 8,
              purpose: "Arrival",
              visual: "Rin crosses the flooded market.",
              subject: "Rin",
              action: "She advances toward the camera.",
              dialogue: null,
              os: null,
              audio: null,
              transitionHint: null,
              continuityNotes: "Keep her satchel visible.",
            },
          ],
        },
        startFrame: {
          id: "frame_start_1",
          imageAssetPath: "images/batches/image_batch_v1/segments/segment_1/start-frame/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
        },
        endFrame: {
          id: "frame_end_1",
          imageAssetPath: "images/batches/image_batch_v1/segments/segment_1/end-frame/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
        },
        promptTemplateKey: "segment_video.generate",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn().mockResolvedValue([
        {
          id: "video_segment_record_1",
          status: "in_review",
        },
      ]),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn(),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn().mockResolvedValue({
        id: "video_segment_record_1",
        batchId: "video_batch_v1",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceImageBatchId: "image_batch_v1",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        status: "generating",
        promptTextSeed: "seed prompt",
        promptTextCurrent: "用户保存后的当前提示词",
        promptUpdatedAt: "2026-03-25T00:12:00.000Z",
        videoAssetPath: null,
        thumbnailAssetPath: null,
        durationSec: null,
        provider: null,
        model: null,
        updatedAt: "2026-03-25T00:12:00.000Z",
        approvedAt: null,
        sourceTaskId: null,
        storageDir: "projects/proj_1-my-story/videos/batches/video_batch_v1/segments/segment_1",
        currentVideoRelPath: "videos/batches/video_batch_v1/segments/segment_1/current.mp4",
        currentMetadataRelPath: "videos/batches/video_batch_v1/segments/segment_1/current.json",
        thumbnailRelPath: "videos/batches/video_batch_v1/segments/segment_1/thumbnail.webp",
        versionsStorageDir: "videos/batches/video_batch_v1/segments/segment_1/versions",
      }),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn().mockResolvedValue({
        id: "video_segment_record_1",
        batchId: "video_batch_v1",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceImageBatchId: "image_batch_v1",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        status: "generating",
        promptTextSeed: "seed prompt",
        promptTextCurrent: "用户保存后的当前提示词",
        promptUpdatedAt: "2026-03-25T00:12:00.000Z",
        videoAssetPath: null,
        thumbnailAssetPath: null,
        durationSec: null,
        provider: null,
        model: null,
        updatedAt: "2026-03-25T00:12:00.000Z",
        approvedAt: null,
        sourceTaskId: null,
        storageDir: "projects/proj_1-my-story/videos/batches/video_batch_v1/segments/segment_1",
        currentVideoRelPath: "videos/batches/video_batch_v1/segments/segment_1/current.mp4",
        currentMetadataRelPath: "videos/batches/video_batch_v1/segments/segment_1/current.json",
        thumbnailRelPath: "videos/batches/video_batch_v1/segments/segment_1/thumbnail.webp",
        versionsStorageDir: "videos/batches/video_batch_v1/segments/segment_1/versions",
      }),
      updateSegment: vi.fn(),
    };
    const videoStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn().mockResolvedValue(
        [
          "Start: {{start_frame_path}}",
          "End: {{end_frame_path}}",
          "Summary: {{segment_summary}}",
          "Shots: {{shots_summary}}",
        ].join("\n"),
      ),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeCurrentVideo: vi.fn(),
      writeVideoVersion: vi.fn(),
      resolveProjectAssetPath: vi
        .fn()
        .mockImplementation(({ assetRelPath }) => `E:/SweetStarAnimMaker/.local-data/${assetRelPath}`),
    };
    const videoProvider = {
      generateSegmentVideo: vi.fn().mockResolvedValue({
        provider: "vector-engine",
        model: "kling-v3",
        videoUrl: "https://cdn.example/output.mp4",
        thumbnailUrl: "https://cdn.example/output.webp",
        rawResponse: '{"status":"completed"}',
        durationSec: 10,
      }),
    };

    const useCase = createProcessSegmentVideoGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      videoRepository,
      videoStorage,
      videoProvider,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-25T00:12:30.000Z")
          .mockReturnValueOnce("2026-03-25T00:13:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_segment_video_1" });

    const providerCall = videoProvider.generateSegmentVideo.mock.calls[0]?.[0];
    expect(providerCall).toMatchObject({
      projectId: "proj_1",
      segmentId: "segment_1",
      promptText: "用户保存后的当前提示词",
    });
    expect(providerCall).not.toHaveProperty("model");
    expect(videoStorage.writePromptSnapshot).toHaveBeenCalledWith({
      taskStorageDir: "projects/proj_1-my-story/tasks/task_segment_video_1",
      promptText: "用户保存后的当前提示词",
      promptVariables: expect.objectContaining({
        segment: expect.objectContaining({ segmentId: "segment_1" }),
      }),
    });
    expect(videoStorage.writeCurrentVideo).toHaveBeenCalledWith({
      segment: expect.objectContaining({
        id: "video_segment_record_1",
        videoAssetPath: "videos/batches/video_batch_v1/segments/segment_1/current.mp4",
        thumbnailAssetPath: "videos/batches/video_batch_v1/segments/segment_1/thumbnail.webp",
        status: "in_review",
      }),
      videoSourceUrl: "https://cdn.example/output.mp4",
      thumbnailSourceUrl: "https://cdn.example/output.webp",
      metadata: expect.objectContaining({
        provider: "vector-engine",
        model: "kling-v3",
      }),
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "videos_in_review",
      updatedAt: "2026-03-25T00:13:00.000Z",
    });
  });

  it("marks the task failed instead of leaving it running when video generation throws", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_segment_video_1",
        projectId: "proj_1",
        type: "segment_video_generate",
        queueName: "segment-video-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_segment_video_1",
        inputRelPath: "tasks/task_segment_video_1/input.json",
        outputRelPath: "tasks/task_segment_video_1/output.json",
        logRelPath: "tasks/task_segment_video_1/log.txt",
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
        storageDir: "projects/proj_1-my-story",
        currentVideoBatchId: "video_batch_v1",
      }),
      listAll: vi.fn(),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateCurrentVideoBatch: vi.fn(),
      updateStatus: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_segment_video_1",
        projectId: "proj_1",
        taskType: "segment_video_generate",
        batchId: "video_batch_v1",
        sourceImageBatchId: "image_batch_v1",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        segment: {
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          name: "Arrival",
          summary: "Rin arrives at the flooded market.",
          durationSec: 8,
          status: "approved",
          lastGeneratedAt: "2026-03-25T00:09:00.000Z",
          approvedAt: "2026-03-25T00:10:00.000Z",
          shots: [],
        },
        startFrame: {
          id: "frame_start_1",
          imageAssetPath: "images/batches/image_batch_v1/segments/segment_1/start-frame/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
        },
        endFrame: {
          id: "frame_end_1",
          imageAssetPath: "images/batches/image_batch_v1/segments/segment_1/end-frame/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
        },
        promptTemplateKey: "segment_video.generate",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const currentSegment = {
      id: "video_segment_record_1",
      batchId: "video_batch_v1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: "image_batch_v1",
      sourceShotScriptId: "shot_script_v1",
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      status: "generating",
      videoAssetPath: null,
      thumbnailAssetPath: null,
      durationSec: null,
      provider: null,
      model: null,
      updatedAt: "2026-03-25T00:12:00.000Z",
      approvedAt: null,
      sourceTaskId: null,
      storageDir: "projects/proj_1-my-story/videos/batches/video_batch_v1/segments/segment_1",
      currentVideoRelPath: "videos/batches/video_batch_v1/segments/segment_1/current.mp4",
      currentMetadataRelPath: "videos/batches/video_batch_v1/segments/segment_1/current.json",
      thumbnailRelPath: "videos/batches/video_batch_v1/segments/segment_1/thumbnail.webp",
      versionsStorageDir: "videos/batches/video_batch_v1/segments/segment_1/versions",
    };
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn().mockResolvedValue([currentSegment]),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn(),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn().mockResolvedValue(currentSegment),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn().mockResolvedValue(currentSegment),
      updateSegment: vi.fn(),
    };
    const videoStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn().mockResolvedValue("Summary: {{segment_summary}}"),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeCurrentVideo: vi.fn(),
      writeVideoVersion: vi.fn(),
      resolveProjectAssetPath: vi
        .fn()
        .mockImplementation(({ assetRelPath }) => `E:/SweetStarAnimMaker/.local-data/${assetRelPath}`),
    };
    const videoProvider = {
      generateSegmentVideo: vi.fn().mockRejectedValue(new Error("Sora video provider request timed out")),
    };

    const useCase = createProcessSegmentVideoGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      videoRepository,
      videoStorage,
      videoProvider,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-25T00:12:30.000Z")
          .mockReturnValueOnce("2026-03-25T00:13:00.000Z"),
      },
    });

    await expect(useCase.execute({ taskId: "task_segment_video_1" })).rejects.toThrow(
      "Sora video provider request timed out",
    );

    expect(videoRepository.updateSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "video_segment_record_1",
        status: "failed",
        videoAssetPath: null,
        thumbnailAssetPath: null,
        updatedAt: "2026-03-25T00:13:00.000Z",
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "videos_in_review",
      updatedAt: "2026-03-25T00:13:00.000Z",
    });
    expect(taskRepository.markFailed).toHaveBeenCalledWith({
      taskId: "task_segment_video_1",
      errorMessage: "Sora video provider request timed out",
      updatedAt: "2026-03-25T00:13:00.000Z",
      finishedAt: "2026-03-25T00:13:00.000Z",
    });
  });

  it("updates the scene-matched segment when different scenes share the same segment id", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_segment_video_scene_2",
        projectId: "proj_1",
        type: "segment_video_generate",
        queueName: "segment-video-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_segment_video_scene_2",
        inputRelPath: "tasks/task_segment_video_scene_2/input.json",
        outputRelPath: "tasks/task_segment_video_scene_2/output.json",
        logRelPath: "tasks/task_segment_video_scene_2/log.txt",
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
        storageDir: "projects/proj_1-my-story",
        currentVideoBatchId: "video_batch_v1",
      }),
      listAll: vi.fn(),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateCurrentVideoBatch: vi.fn(),
      updateStatus: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_segment_video_scene_2",
        projectId: "proj_1",
        taskType: "segment_video_generate",
        batchId: "video_batch_v1",
        sourceImageBatchId: "image_batch_v1",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_2",
        segment: {
          segmentId: "segment_1",
          sceneId: "scene_2",
          order: 2,
          name: "Crossroads",
          summary: "Rin turns toward the flooded crossroads.",
          durationSec: 8,
          status: "approved",
          lastGeneratedAt: "2026-03-25T00:09:00.000Z",
          approvedAt: "2026-03-25T00:10:00.000Z",
          shots: [],
        },
        startFrame: {
          id: "frame_start_scene_2",
          imageAssetPath: "images/batches/image_batch_v1/segments/scene_2__segment_1/start-frame/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
        },
        endFrame: {
          id: "frame_end_scene_2",
          imageAssetPath: "images/batches/image_batch_v1/segments/scene_2__segment_1/end-frame/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
        },
        promptTemplateKey: "segment_video.generate",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const wrongSceneSegment = {
      id: "video_segment_scene_1",
      batchId: "video_batch_v1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: "image_batch_v1",
      sourceShotScriptId: "shot_script_v1",
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      status: "generating",
      videoAssetPath: null,
      thumbnailAssetPath: null,
      durationSec: null,
      provider: null,
      model: null,
      updatedAt: "2026-03-25T00:12:00.000Z",
      approvedAt: null,
      sourceTaskId: null,
      storageDir: "projects/proj_1-my-story/videos/batches/video_batch_v1/segments/scene_1__segment_1",
      currentVideoRelPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/current.mp4",
      currentMetadataRelPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/current.json",
      thumbnailRelPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/thumbnail.webp",
      versionsStorageDir: "videos/batches/video_batch_v1/segments/scene_1__segment_1/versions",
    };
    const targetSegment = {
      ...wrongSceneSegment,
      id: "video_segment_scene_2",
      sceneId: "scene_2",
      order: 2,
      storageDir: "projects/proj_1-my-story/videos/batches/video_batch_v1/segments/scene_2__segment_1",
      currentVideoRelPath: "videos/batches/video_batch_v1/segments/scene_2__segment_1/current.mp4",
      currentMetadataRelPath: "videos/batches/video_batch_v1/segments/scene_2__segment_1/current.json",
      thumbnailRelPath: "videos/batches/video_batch_v1/segments/scene_2__segment_1/thumbnail.webp",
      versionsStorageDir: "videos/batches/video_batch_v1/segments/scene_2__segment_1/versions",
    };
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn().mockResolvedValue([
        {
          id: targetSegment.id,
          status: "in_review",
        },
      ]),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn(),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn().mockResolvedValue(wrongSceneSegment),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn().mockResolvedValue(targetSegment),
      updateSegment: vi.fn(),
    };
    const videoStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn().mockResolvedValue("Summary: {{segment_summary}}"),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeCurrentVideo: vi.fn(),
      writeVideoVersion: vi.fn(),
      resolveProjectAssetPath: vi
        .fn()
        .mockImplementation(({ assetRelPath }) => `E:/SweetStarAnimMaker/.local-data/${assetRelPath}`),
    };
    const videoProvider = {
      generateSegmentVideo: vi.fn().mockResolvedValue({
        provider: "vector-engine",
        model: "kling-v3",
        videoUrl: "https://cdn.example/scene-2-output.mp4",
        thumbnailUrl: "https://cdn.example/scene-2-output.webp",
        rawResponse: '{"status":"completed"}',
        durationSec: 10,
      }),
    };

    const useCase = createProcessSegmentVideoGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      videoRepository,
      videoStorage,
      videoProvider,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-25T00:12:30.000Z")
          .mockReturnValueOnce("2026-03-25T00:13:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_segment_video_scene_2" });

    expect(videoStorage.writeCurrentVideo).toHaveBeenCalledWith({
      segment: expect.objectContaining({
        id: "video_segment_scene_2",
        sceneId: "scene_2",
        videoAssetPath: "videos/batches/video_batch_v1/segments/scene_2__segment_1/current.mp4",
      }),
      videoSourceUrl: "https://cdn.example/scene-2-output.mp4",
      thumbnailSourceUrl: "https://cdn.example/scene-2-output.webp",
      metadata: expect.objectContaining({
        provider: "vector-engine",
        model: "kling-v3",
      }),
    });
  });
});
