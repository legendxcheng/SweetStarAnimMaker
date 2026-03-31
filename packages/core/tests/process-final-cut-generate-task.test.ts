import { describe, expect, it, vi } from "vitest";

import { createProcessFinalCutGenerateTaskUseCase } from "../src/index";

describe("process final cut generate task use case", () => {
  it("sorts approved shots by scene, segment, and shot before writing the concat manifest and final cut", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_final_cut_1",
        projectId: "proj_1",
        type: "final_cut_generate",
        queueName: "final-cut-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_final_cut_1",
        inputRelPath: "tasks/task_final_cut_1/input.json",
        outputRelPath: "tasks/task_final_cut_1/output.json",
        logRelPath: "tasks/task_final_cut_1/log.txt",
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
        currentVideoBatchId: "video_batch_1",
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
        taskId: "task_final_cut_1",
        projectId: "proj_1",
        taskType: "final_cut_generate",
        sourceVideoBatchId: "video_batch_1",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn().mockResolvedValue({
        id: "video_batch_1",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceImageBatchId: "image_batch_1",
        sourceShotScriptId: "shot_script_1",
        shotCount: 3,
        storageDir: "projects/proj_1-my-story/videos/batches/video_batch_1",
        manifestRelPath: "videos/batches/video_batch_1/manifest.json",
        createdAt: "2026-03-31T00:00:00.000Z",
        updatedAt: "2026-03-31T00:00:00.000Z",
        segmentCount: 3,
      }),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn().mockResolvedValue([
        {
          id: "video_shot_3",
          projectId: "proj_1",
          batchId: "video_batch_1",
          sourceImageBatchId: "image_batch_1",
          sourceShotScriptId: "shot_script_1",
          shotId: "shot_1",
          shotCode: "SC02-SG01-SH01",
          sceneId: "scene_2",
          segmentId: "segment_1",
          segmentOrder: 1,
          shotOrder: 1,
          frameDependency: "start_frame_only",
          status: "approved",
          promptTextSeed: "seed 3",
          promptTextCurrent: "current 3",
          promptUpdatedAt: "2026-03-31T00:00:00.000Z",
          videoAssetPath: "videos/batches/video_batch_1/shots/scene_2__segment_1__shot_1/current.mp4",
          thumbnailAssetPath: null,
          durationSec: 3,
          provider: "openai",
          model: "sora-2-all",
          updatedAt: "2026-03-31T00:00:00.000Z",
          approvedAt: "2026-03-31T00:00:00.000Z",
          sourceTaskId: "task_segment_video_3",
          projectStorageDir: "projects/proj_1-my-story",
          storageDir: "ignored",
          currentVideoRelPath: "ignored",
          currentMetadataRelPath: "ignored",
          thumbnailRelPath: "ignored",
          versionsStorageDir: "ignored",
        },
        {
          id: "video_shot_2",
          projectId: "proj_1",
          batchId: "video_batch_1",
          sourceImageBatchId: "image_batch_1",
          sourceShotScriptId: "shot_script_1",
          shotId: "shot_2",
          shotCode: "SC01-SG01-SH02",
          sceneId: "scene_1",
          segmentId: "segment_1",
          segmentOrder: 1,
          shotOrder: 2,
          frameDependency: "start_frame_only",
          status: "approved",
          promptTextSeed: "seed 2",
          promptTextCurrent: "current 2",
          promptUpdatedAt: "2026-03-31T00:00:00.000Z",
          videoAssetPath: "videos/batches/video_batch_1/shots/scene_1__segment_1__shot_2/current.mp4",
          thumbnailAssetPath: null,
          durationSec: 3,
          provider: "openai",
          model: "sora-2-all",
          updatedAt: "2026-03-31T00:00:00.000Z",
          approvedAt: "2026-03-31T00:00:00.000Z",
          sourceTaskId: "task_segment_video_2",
          projectStorageDir: "projects/proj_1-my-story",
          storageDir: "ignored",
          currentVideoRelPath: "ignored",
          currentMetadataRelPath: "ignored",
          thumbnailRelPath: "ignored",
          versionsStorageDir: "ignored",
        },
        {
          id: "video_shot_1",
          projectId: "proj_1",
          batchId: "video_batch_1",
          sourceImageBatchId: "image_batch_1",
          sourceShotScriptId: "shot_script_1",
          shotId: "shot_1",
          shotCode: "SC01-SG02-SH01",
          sceneId: "scene_1",
          segmentId: "segment_2",
          segmentOrder: 2,
          shotOrder: 1,
          frameDependency: "start_frame_only",
          status: "approved",
          promptTextSeed: "seed 1",
          promptTextCurrent: "current 1",
          promptUpdatedAt: "2026-03-31T00:00:00.000Z",
          videoAssetPath: "videos/batches/video_batch_1/shots/scene_1__segment_2__shot_1/current.mp4",
          thumbnailAssetPath: null,
          durationSec: 3,
          provider: "openai",
          model: "sora-2-all",
          updatedAt: "2026-03-31T00:00:00.000Z",
          approvedAt: "2026-03-31T00:00:00.000Z",
          sourceTaskId: "task_segment_video_1",
          projectStorageDir: "projects/proj_1-my-story",
          storageDir: "ignored",
          currentVideoRelPath: "ignored",
          currentMetadataRelPath: "ignored",
          thumbnailRelPath: "ignored",
          versionsStorageDir: "ignored",
        },
      ]),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn(),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentIdAndShotId: vi.fn(),
      updateSegment: vi.fn(),
      findCurrentFinalCutByProjectId: vi.fn(),
      upsertFinalCut: vi.fn(),
    };
    const videoStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writePromptPlan: vi.fn(),
      writeRawResponse: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeCurrentVideo: vi.fn(),
      writeVideoVersion: vi.fn(),
      writeFinalCutManifest: vi.fn(),
      writeFinalCutFiles: vi.fn(),
      resolveProjectAssetPath: vi.fn().mockImplementation(({ assetRelPath }) => `E:/SweetStarAnimMaker/.local-data/projects/proj_1-my-story/${assetRelPath}`),
    };
    const finalCutRenderer = {
      render: vi.fn().mockResolvedValue(Uint8Array.from([1, 2, 3, 4])),
    };

    const useCase = createProcessFinalCutGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      videoRepository,
      videoStorage,
      finalCutRenderer,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-31T00:00:10.000Z")
          .mockReturnValueOnce("2026-03-31T00:00:20.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_final_cut_1" });

    expect(videoStorage.writeFinalCutManifest).toHaveBeenCalledWith({
      finalCut: expect.objectContaining({
        id: "final_cut_task_final_cut_1",
        sourceVideoBatchId: "video_batch_1",
      }),
      lines: [
        "file 'E:/SweetStarAnimMaker/.local-data/projects/proj_1-my-story/videos/batches/video_batch_1/shots/scene_1__segment_1__shot_2/current.mp4'",
        "file 'E:/SweetStarAnimMaker/.local-data/projects/proj_1-my-story/videos/batches/video_batch_1/shots/scene_1__segment_2__shot_1/current.mp4'",
        "file 'E:/SweetStarAnimMaker/.local-data/projects/proj_1-my-story/videos/batches/video_batch_1/shots/scene_2__segment_1__shot_1/current.mp4'",
      ],
    });
    expect(finalCutRenderer.render).toHaveBeenCalledWith({
      manifestPath:
        "E:/SweetStarAnimMaker/.local-data/projects/proj_1-my-story/final-cut/manifests/final_cut_task_final_cut_1.txt",
    });
    expect(videoStorage.writeFinalCutFiles).toHaveBeenCalledWith({
      finalCut: expect.objectContaining({
        id: "final_cut_task_final_cut_1",
        shotCount: 3,
        status: "ready",
      }),
      videoContent: Uint8Array.from([1, 2, 3, 4]),
    });
    expect(videoRepository.upsertFinalCut).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "final_cut_task_final_cut_1",
        shotCount: 3,
        status: "ready",
      }),
    );
  });
});
