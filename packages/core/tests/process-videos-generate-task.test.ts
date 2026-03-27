import { describe, expect, it, vi } from "vitest";

import { createProcessVideosGenerateTaskUseCase } from "../src/index";

describe("process videos generate task use case", () => {
  it("creates one current video record per shot and enqueues one shot task per shot", async () => {
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
              summary: "Rin arrives.",
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
                  purpose: "Discovery",
                  visual: "Rin spots the route forward.",
                  subject: "Rin",
                  action: "Rin points toward the brighter alley beyond the stalls.",
                  dialogue: null,
                  os: null,
                  audio: null,
                  transitionHint: null,
                  continuityNotes: "Water should keep flowing left to right.",
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
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_2/end-frame/current.png",
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
      readPromptTemplate: vi.fn(),
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
      generateVideoPrompt: vi
        .fn()
        .mockResolvedValueOnce({
          finalPrompt: "以<<<image_1>>>为首帧锚点，林谨慎走入积水市场，口型清晰说出“有人先到了”，雨声持续压场。",
          dialoguePlan: "说话主体：林；台词：有人先到了。",
          audioPlan: "雨声持续，摊布拍打声和远处人群骚动做底。",
          visualGuardrails: "保持林的外观、服装和挎包位置稳定。",
          rationale: "把对白和环境声直接编入 Kling Omni 单镜头提示词。",
          provider: "gemini",
          model: "gemini-3.1-pro-preview",
        })
        .mockResolvedValueOnce({
          finalPrompt: "以<<<image_1>>>为首帧锚点，林指向更亮的巷口，无对白，保留水流和脚步涉水声。",
          dialoguePlan: "无明确台词。",
          audioPlan: "水流声、脚步涉水声。",
          visualGuardrails: "从首帧自然推进到尾帧，避免跳切和主体漂移。",
          rationale: "强调尾帧衔接和动作推进。",
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
      taskIdGenerator: {
        generateTaskId: vi
          .fn()
          .mockReturnValueOnce("task_segment_video_1")
          .mockReturnValueOnce("task_segment_video_2"),
      },
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
        shotCount: 2,
      }),
    );
    expect(videoRepository.insertSegment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        shotId: "shot_1",
        shotCode: "SC01-SG01-SH01",
        frameDependency: "start_frame_only",
        durationSec: 3,
        status: "generating",
        promptTextSeed:
          "以<<<image_1>>>为首帧锚点，林谨慎走入积水市场，口型清晰说出“有人先到了”，雨声持续压场。",
        promptTextCurrent:
          "以<<<image_1>>>为首帧锚点，林谨慎走入积水市场，口型清晰说出“有人先到了”，雨声持续压场。",
      }),
    );
    expect(videoRepository.insertSegment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        shotId: "shot_2",
        shotCode: "SC01-SG01-SH02",
        frameDependency: "start_and_end_frame",
        durationSec: 5,
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(1, {
      task: expect.objectContaining({ id: "task_segment_video_1" }),
      input: expect.objectContaining({
        taskType: "segment_video_generate",
        batchId: "video_batch_task_videos_1",
        sceneId: "scene_1",
        segmentId: "segment_1",
        shotId: "shot_1",
        shotCode: "SC01-SG01-SH01",
        frameDependency: "start_frame_only",
        startFrame: expect.objectContaining({ id: "frame_start_1" }),
        endFrame: null,
      }),
    });
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(2, {
      task: expect.objectContaining({ id: "task_segment_video_2" }),
      input: expect.objectContaining({
        taskType: "segment_video_generate",
        batchId: "video_batch_task_videos_1",
        sceneId: "scene_1",
        segmentId: "segment_1",
        shotId: "shot_2",
        shotCode: "SC01-SG01-SH02",
        frameDependency: "start_and_end_frame",
        startFrame: expect.objectContaining({ id: "frame_start_2" }),
        endFrame: expect.objectContaining({ id: "frame_end_2" }),
      }),
    });
    expect(taskQueue.enqueue).toHaveBeenNthCalledWith(1, {
      taskId: "task_segment_video_1",
      queueName: "segment-video-generate",
      taskType: "segment_video_generate",
    });
    expect(taskQueue.enqueue).toHaveBeenNthCalledWith(2, {
      taskId: "task_segment_video_2",
      queueName: "segment-video-generate",
      taskType: "segment_video_generate",
    });
    expect(projectRepository.updateCurrentVideoBatch).toHaveBeenCalledWith({
      projectId: "proj_1",
      batchId: "video_batch_task_videos_1",
    });
    expect(videoPromptProvider.generateVideoPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        currentShot: expect.objectContaining({
          shotCode: "SC01-SG01-SH01",
          dialogue: null,
          audio: null,
        }),
        startFrame: expect.objectContaining({
          imageAssetPath:
            "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
        }),
        endFrame: null,
      }),
    );
    expect(videoStorage.writePromptPlan).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        segment: expect.objectContaining({ shotId: "shot_1" }),
        planning: expect.objectContaining({
          dialoguePlan: "说话主体：林；台词：有人先到了。",
          provider: "gemini",
        }),
      }),
    );
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
      readPromptTemplate: vi.fn(),
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
});
