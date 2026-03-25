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
        model: "sora-2-all",
        videoUrl: "https://cdn.example/output.mp4",
        thumbnailUrl: "https://cdn.example/output.webp",
        rawResponse: '{"status":"completed"}',
        durationSec: 8,
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

    expect(videoProvider.generateSegmentVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj_1",
        segmentId: "segment_1",
        model: "sora-2-all",
      }),
    );
    expect(videoStorage.writePromptSnapshot).toHaveBeenCalledWith({
      taskStorageDir: "projects/proj_1-my-story/tasks/task_segment_video_1",
      promptText: expect.stringContaining("Summary: Rin arrives at the flooded market."),
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
        model: "sora-2-all",
      }),
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "videos_in_review",
      updatedAt: "2026-03-25T00:13:00.000Z",
    });
  });
});
