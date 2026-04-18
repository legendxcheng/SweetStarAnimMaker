import { describe, expect, it, vi } from "vitest";

import { createProcessVideosGenerateTaskUseCase } from "../src/index";

describe("process videos generate task use case", () => {
  it("creates one segment record with deterministic deduplicated references and defers prompt text generation", async () => {
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
          shotCount: 2,
          totalRequiredFrameCount: 3,
          approvedShotCount: 2,
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
          shotCount: 2,
          totalDurationSec: 8,
          segments: [
            {
              segmentId: "segment_1",
              sceneId: "scene_1",
              order: 1,
              name: "Arrival",
              summary: "Rin arrives and follows the contact through the market.",
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
                  shotCode: "SC01-SG01-SH01",
                  durationSec: 3,
                  frameDependency: "start_frame_only",
                  purpose: "Arrival",
                  visual: "Rin enters the flooded market.",
                  subject: "Rin",
                  action: "Rin steps into the flooded market and scans ahead.",
                  dialogue: null,
                  os: null,
                  audio: null,
                  transitionHint: null,
                  continuityNotes: "Keep her satchel visible.",
                },
                {
                  id: "shot_2",
                  sceneId: "scene_1",
                  segmentId: "segment_1",
                  order: 2,
                  shotCode: "SC01-SG01-SH02",
                  durationSec: 5,
                  frameDependency: "start_and_end_frame",
                  purpose: "Follow",
                  visual: "Rin follows the contact through the brighter aisle.",
                  subject: "Rin",
                  action: "Rin turns and follows the contact deeper into the market.",
                  dialogue: null,
                  os: null,
                  audio: null,
                  transitionHint: null,
                  continuityNotes: "Keep water flow left to right.",
                },
              ],
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
      listFramesByBatchId: vi.fn(),
      listShotsByBatchId: vi.fn().mockResolvedValue([
        {
          id: "shot_ref_1",
          batchId: "image_batch_v1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_v1",
          shotId: "shot_1",
          shotCode: "SC01-SG01-SH01",
          sceneId: "scene_1",
          segmentId: "segment_1",
          segmentOrder: 1,
          shotOrder: 1,
          durationSec: 3,
          frameDependency: "start_frame_only",
          referenceStatus: "approved",
          updatedAt: "2026-03-25T00:10:00.000Z",
          startFrame: {
            id: "frame_start_1",
            frameType: "start_frame",
            imageStatus: "approved",
            imageAssetPath:
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
            imageWidth: 1024,
            imageHeight: 1024,
          },
          endFrame: null,
        },
        {
          id: "shot_ref_2",
          batchId: "image_batch_v1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_v1",
          shotId: "shot_2",
          shotCode: "SC01-SG01-SH02",
          sceneId: "scene_1",
          segmentId: "segment_1",
          segmentOrder: 1,
          shotOrder: 2,
          durationSec: 5,
          frameDependency: "start_and_end_frame",
          referenceStatus: "approved",
          updatedAt: "2026-03-25T00:10:00.000Z",
          startFrame: {
            id: "frame_start_2",
            frameType: "start_frame",
            imageStatus: "approved",
            imageAssetPath:
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_2/start-frame/current.png",
            imageWidth: 1024,
            imageHeight: 1024,
          },
          endFrame: {
            id: "frame_end_2",
            frameType: "end_frame",
            imageStatus: "approved",
            imageAssetPath:
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_2/start-frame/current.png",
            imageWidth: 1024,
            imageHeight: 1024,
          },
        },
      ]),
      insertFrame: vi.fn(),
      insertShot: vi.fn(),
      findFrameById: vi.fn(),
      findShotById: vi.fn(),
      updateFrame: vi.fn(),
      updateShot: vi.fn(),
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
      readPromptTemplate: vi
        .fn()
        .mockResolvedValue("Segment summary: {{segment_summary}}\nShot summary: {{shot_summary}}"),
      writePromptSnapshot: vi.fn(),
      writePromptPlan: vi.fn(),
      writeRawResponse: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeCurrentVideo: vi.fn(),
      writeVideoVersion: vi.fn(),
      resolveProjectAssetPath: vi.fn(),
    };
    const taskQueue = { enqueue: vi.fn() };
    const videoPromptProvider = {
      generateVideoPrompt: vi.fn().mockRejectedValue(new Error("should not be called")),
    };

    const useCase = createProcessVideosGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotImageRepository,
      videoRepository,
      videoStorage,
      videoPromptProvider,
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

    expect(videoRepository.insertSegment).toHaveBeenCalledTimes(1);
    expect(videoRepository.insertSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        segmentId: "segment_1",
        segmentName: "Arrival",
        segmentSummary: "Rin arrives and follows the contact through the market.",
        shotCount: 2,
        sourceShotIds: ["shot_1", "shot_2"],
        referenceImages: [
          expect.objectContaining({
            assetPath:
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
            sourceShotId: "shot_1",
            order: 0,
          }),
          expect.objectContaining({
            assetPath:
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_2/start-frame/current.png",
            sourceShotId: "shot_2",
            order: 1,
          }),
        ],
        referenceAudios: [],
        promptTextSeed: "",
        promptTextCurrent: "",
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledTimes(1);
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_segment_video_1" }),
      input: expect.objectContaining({
        taskType: "segment_video_prompt_generate",
        batchId: "video_batch_task_videos_1",
        sceneId: "scene_1",
        segmentId: "segment_1",
        shotCount: 2,
        sourceShotIds: ["shot_1", "shot_2"],
        referenceImages: [
          expect.objectContaining({
            id: "video_ref_image_segment_1_shot_1_start_frame",
            sourceShotId: "shot_1",
          }),
          expect.objectContaining({
            id: "video_ref_image_segment_1_shot_2_start_frame",
            sourceShotId: "shot_2",
          }),
        ],
        referenceAudios: [],
      }),
    });
    expect(taskQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(taskQueue.enqueue).toHaveBeenCalledWith({
      taskId: "task_segment_video_1",
      queueName: "segment-video-prompt-generate",
      taskType: "segment_video_prompt_generate",
    });
    expect(projectRepository.updateCurrentVideoBatch).toHaveBeenCalledWith({
      projectId: "proj_1",
      batchId: "video_batch_task_videos_1",
    });
    expect(videoStorage.readPromptTemplate).not.toHaveBeenCalled();
    expect(videoPromptProvider.generateVideoPrompt).not.toHaveBeenCalled();
    expect(videoStorage.writePromptPlan).not.toHaveBeenCalled();
  });

  it("sets the current video batch before enqueuing shot video tasks", async () => {
    const callOrder: string[] = [];
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
      updateCurrentVideoBatch: vi.fn().mockImplementation(() => {
        callOrder.push("updateCurrentVideoBatch");
      }),
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
          shotCount: 1,
          totalRequiredFrameCount: 1,
          approvedShotCount: 1,
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
          totalDurationSec: 3,
          segments: [
            {
              segmentId: "segment_1",
              sceneId: "scene_1",
              order: 1,
              name: "Arrival",
              summary: "Rin arrives.",
              durationSec: 3,
              status: "approved",
              lastGeneratedAt: "2026-03-25T00:09:00.000Z",
              approvedAt: "2026-03-25T00:10:00.000Z",
              shots: [
                {
                  id: "shot_1",
                  sceneId: "scene_1",
                  segmentId: "segment_1",
                  order: 1,
                  shotCode: "SC01-SG01-SH01",
                  durationSec: 3,
                  frameDependency: "start_frame_only",
                  purpose: "Arrival",
                  visual: "Rin enters the flooded market.",
                  subject: "Rin",
                  action: "Rin steps into the flooded market and scans ahead.",
                  dialogue: null,
                  os: null,
                  audio: null,
                  transitionHint: null,
                  continuityNotes: null,
                },
              ],
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
      listFramesByBatchId: vi.fn(),
      listShotsByBatchId: vi.fn().mockResolvedValue([
        {
          id: "shot_ref_1",
          batchId: "image_batch_v1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_v1",
          shotId: "shot_1",
          shotCode: "SC01-SG01-SH01",
          sceneId: "scene_1",
          segmentId: "segment_1",
          segmentOrder: 1,
          shotOrder: 1,
          durationSec: 3,
          frameDependency: "start_frame_only",
          referenceStatus: "approved",
          updatedAt: "2026-03-25T00:10:00.000Z",
          startFrame: {
            id: "frame_start_1",
            frameType: "start_frame",
            imageStatus: "approved",
            imageAssetPath:
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
            imageWidth: 1024,
            imageHeight: 1024,
          },
          endFrame: null,
        },
      ]),
      insertFrame: vi.fn(),
      insertShot: vi.fn(),
      findFrameById: vi.fn(),
      findShotById: vi.fn(),
      updateFrame: vi.fn(),
      updateShot: vi.fn(),
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
      readPromptTemplate: vi
        .fn()
        .mockResolvedValue("Segment summary: {{segment_summary}}\nShot summary: {{shot_summary}}"),
      writePromptSnapshot: vi.fn(),
      writePromptPlan: vi.fn(),
      writeRawResponse: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeCurrentVideo: vi.fn(),
      writeVideoVersion: vi.fn(),
      resolveProjectAssetPath: vi.fn(),
    };
    const taskQueue = {
      enqueue: vi.fn().mockImplementation(() => {
        callOrder.push("enqueue");
      }),
    };
    const videoPromptProvider = {
      generateVideoPrompt: vi.fn().mockResolvedValue({
        finalPrompt: "以<<<image_1>>>为首帧锚点，让林进入市场并观察前方。",
        dialoguePlan: "无明确台词。",
        audioPlan: "雨声。",
        visualGuardrails: "保持单镜头连续。",
        rationale: "最小可用提示词。",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
      }),
    };

    const useCase = createProcessVideosGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotImageRepository,
      videoRepository,
      videoStorage,
      videoPromptProvider,
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

    expect(callOrder).toEqual(["updateCurrentVideoBatch", "enqueue"]);
  });

  it("marks the task failed and restores the project status when batch orchestration errors", async () => {
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
          shotCount: 1,
          totalRequiredFrameCount: 1,
          approvedShotCount: 1,
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
          totalDurationSec: 3,
          segments: [
            {
              segmentId: "segment_1",
              sceneId: "scene_1",
              order: 1,
              name: "Arrival",
              summary: "Rin arrives.",
              durationSec: 3,
              status: "approved",
              lastGeneratedAt: "2026-03-25T00:09:00.000Z",
              approvedAt: "2026-03-25T00:10:00.000Z",
              shots: [
                {
                  id: "shot_1",
                  sceneId: "scene_1",
                  segmentId: "segment_1",
                  order: 1,
                  shotCode: "SC01-SG01-SH01",
                  durationSec: 3,
                  frameDependency: "start_frame_only",
                  purpose: "Arrival",
                  visual: "Rin enters the flooded market.",
                  subject: "Rin",
                  action: "Rin steps into the flooded market and scans ahead.",
                  dialogue: null,
                  os: null,
                  audio: null,
                  transitionHint: null,
                  continuityNotes: null,
                },
              ],
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
      listFramesByBatchId: vi.fn(),
      listShotsByBatchId: vi.fn().mockResolvedValue([
        {
          id: "shot_ref_1",
          batchId: "image_batch_v1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_v1",
          shotId: "shot_1",
          shotCode: "SC01-SG01-SH01",
          sceneId: "scene_1",
          segmentId: "segment_1",
          segmentOrder: 1,
          shotOrder: 1,
          durationSec: 3,
          frameDependency: "start_frame_only",
          referenceStatus: "approved",
          updatedAt: "2026-03-25T00:10:00.000Z",
          startFrame: {
            id: "frame_start_1",
            frameType: "start_frame",
            imageStatus: "approved",
            imageAssetPath:
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
            imageWidth: 1024,
            imageHeight: 1024,
          },
          endFrame: null,
        },
      ]),
      insertFrame: vi.fn(),
      insertShot: vi.fn(),
      findFrameById: vi.fn(),
      findShotById: vi.fn(),
      updateFrame: vi.fn(),
      updateShot: vi.fn(),
    };
    const videoRepository = {
      insertBatch: vi.fn().mockRejectedValue(new Error("batch insert failed")),
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
      readPromptTemplate: vi
        .fn()
        .mockResolvedValue("Segment summary: {{segment_summary}}\nShot summary: {{shot_summary}}"),
      writePromptSnapshot: vi.fn(),
      writePromptPlan: vi.fn(),
      writeRawResponse: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeCurrentVideo: vi.fn(),
      writeVideoVersion: vi.fn(),
      resolveProjectAssetPath: vi.fn(),
    };
    const taskQueue = { enqueue: vi.fn() };
    const videoPromptProvider = { generateVideoPrompt: vi.fn() };

    const useCase = createProcessVideosGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotImageRepository,
      videoRepository,
      videoStorage,
      videoPromptProvider,
      taskQueue,
      taskIdGenerator: { generateTaskId: () => "task_segment_video_1" },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-25T00:12:00.000Z")
          .mockReturnValueOnce("2026-03-25T00:13:00.000Z"),
      },
    });

    await expect(useCase.execute({ taskId: "task_videos_1" })).rejects.toThrow(
      "batch insert failed",
    );

    expect(taskFileStorage.appendTaskLog).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_videos_1" }),
      message: "videos batch failed: batch insert failed",
    });
    expect(taskRepository.markFailed).toHaveBeenCalledWith({
      taskId: "task_videos_1",
      errorMessage: "batch insert failed",
      updatedAt: "2026-03-25T00:13:00.000Z",
      finishedAt: "2026-03-25T00:13:00.000Z",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "images_approved",
      updatedAt: "2026-03-25T00:13:00.000Z",
    });
  });
});
