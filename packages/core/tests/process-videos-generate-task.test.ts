import { describe, expect, it, vi } from "vitest";

import { createProcessVideosGenerateTaskUseCase } from "../src/index";

describe("process videos generate task use case", () => {
  it("creates one current video record per segment and enqueues one segment task per segment", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_videos_1",
        projectId: "proj_1",
        type: "videos_generate",
        queueName: "videos-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_videos_1",
        inputRelPath: "tasks/task_videos_1/input.json",
        outputRelPath: "tasks/task_videos_1/output.json",
        logRelPath: "tasks/task_videos_1/log.txt",
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
        currentVideoBatchId: null,
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
        taskId: "task_videos_1",
        projectId: "proj_1",
        taskType: "videos_generate",
        sourceImageBatchId: "image_batch_v1",
        imageBatch: {
          id: "image_batch_v1",
          sourceShotScriptId: "shot_script_v1",
          segmentCount: 1,
          totalFrameCount: 2,
          approvedFrameCount: 2,
          updatedAt: "2026-03-25T00:10:00.000Z",
        },
        sourceShotScriptId: "shot_script_v1",
        shotScript: {
          id: "shot_script_v1",
          title: "Episode 1",
          sourceStoryboardId: "storyboard_v1",
          sourceTaskId: "task_shot_script",
          updatedAt: "2026-03-25T00:09:00.000Z",
          approvedAt: "2026-03-25T00:10:00.000Z",
          segmentCount: 1,
          shotCount: 1,
          totalDurationSec: 8,
          segments: [
            {
              segmentId: "segment_1",
              sceneId: "scene_1",
              order: 1,
              name: "Arrival",
              summary: "Rin arrives.",
              durationSec: 8,
              status: "approved",
              lastGeneratedAt: "2026-03-25T00:09:00.000Z",
              approvedAt: "2026-03-25T00:10:00.000Z",
              shots: [],
            },
          ],
        },
        promptTemplateKey: "segment_video.generate",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn().mockResolvedValue([
        {
          id: "frame_start_1",
          batchId: "image_batch_v1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_v1",
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          frameType: "start_frame",
          planStatus: "planned",
          imageStatus: "approved",
          selectedCharacterIds: [],
          matchedReferenceImagePaths: [],
          unmatchedCharacterIds: [],
          promptTextSeed: "seed",
          promptTextCurrent: "prompt",
          negativePromptTextCurrent: null,
          promptUpdatedAt: null,
          imageAssetPath: "images/batches/image_batch_v1/segments/segment_1/start-frame/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
          provider: "vector-engine",
          model: "seedream",
          approvedAt: "2026-03-25T00:10:00.000Z",
          updatedAt: "2026-03-25T00:10:00.000Z",
          sourceTaskId: "task_frame_start",
        },
        {
          id: "frame_end_1",
          batchId: "image_batch_v1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_v1",
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          frameType: "end_frame",
          planStatus: "planned",
          imageStatus: "approved",
          selectedCharacterIds: [],
          matchedReferenceImagePaths: [],
          unmatchedCharacterIds: [],
          promptTextSeed: "seed",
          promptTextCurrent: "prompt",
          negativePromptTextCurrent: null,
          promptUpdatedAt: null,
          imageAssetPath: "images/batches/image_batch_v1/segments/segment_1/end-frame/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
          provider: "vector-engine",
          model: "seedream",
          approvedAt: "2026-03-25T00:10:00.000Z",
          updatedAt: "2026-03-25T00:10:00.000Z",
          sourceTaskId: "task_frame_end",
        },
      ]),
      insertFrame: vi.fn(),
      findFrameById: vi.fn(),
      updateFrame: vi.fn(),
    };
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn(),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn(),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
      updateSegment: vi.fn(),
    };
    const videoStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeCurrentVideo: vi.fn(),
      writeVideoVersion: vi.fn(),
      resolveProjectAssetPath: vi.fn(),
    };
    const taskQueue = { enqueue: vi.fn() };

    const useCase = createProcessVideosGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotImageRepository,
      videoRepository,
      videoStorage,
      taskQueue,
      taskIdGenerator: { generateTaskId: () => "task_segment_video_1" },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-25T00:12:00.000Z")
          .mockReturnValueOnce("2026-03-25T00:13:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_videos_1" });

    expect(videoRepository.insertBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "video_batch_task_videos_1",
        sourceImageBatchId: "image_batch_v1",
        sourceShotScriptId: "shot_script_v1",
      }),
    );
    expect(videoRepository.insertSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        segmentId: "segment_1",
        status: "generating",
        videoAssetPath: null,
        thumbnailAssetPath: null,
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_segment_video_1" }),
      input: expect.objectContaining({
        taskType: "segment_video_generate",
        batchId: "video_batch_task_videos_1",
        segmentId: "segment_1",
        startFrame: expect.objectContaining({ id: "frame_start_1" }),
        endFrame: expect.objectContaining({ id: "frame_end_1" }),
      }),
    });
    expect(taskQueue.enqueue).toHaveBeenCalledWith({
      taskId: "task_segment_video_1",
      queueName: "segment-video-generate",
      taskType: "segment_video_generate",
    });
    expect(projectRepository.updateCurrentVideoBatch).toHaveBeenCalledWith({
      projectId: "proj_1",
      batchId: "video_batch_task_videos_1",
    });
  });
});
