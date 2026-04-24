import { describe, expect, it, vi } from "vitest";

import { createProcessSegmentVideoPromptGenerateTaskUseCase } from "../src/index";

describe("process segment video prompt generate task use case", () => {
  it("generates a segment-scoped prompt plan from segment shots and persisted multimodal references without auto-enqueueing video generation", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_segment_video_prompt_1",
        projectId: "proj_1",
        type: "segment_video_prompt_generate",
        queueName: "segment-video-prompt-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_segment_video_prompt_1",
        inputRelPath: "tasks/task_segment_video_prompt_1/input.json",
        outputRelPath: "tasks/task_segment_video_prompt_1/output.json",
        logRelPath: "tasks/task_segment_video_prompt_1/log.txt",
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
        taskId: "task_segment_video_prompt_1",
        projectId: "proj_1",
        taskType: "segment_video_prompt_generate",
        batchId: "video_batch_v1",
        sourceImageBatchId: "image_batch_v1",
        sourceShotScriptId: "shot_script_v1",
        sceneId: "scene_1",
        segmentId: "segment_1",
        shotId: "shot_1",
        shotCode: "SC01-SG01-SH01",
        frameDependency: "start_frame_only",
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
              shotCode: "SC01-SG01-SH01",
              durationSec: 3,
              frameDependency: "start_frame_only",
              purpose: "Arrival",
              visual: "Rin crosses the flooded market.",
              subject: "Rin",
              action: "She advances toward the camera.",
              dialogue: "有人先到了",
              os: null,
              audio: "雨声不断",
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
              frameDependency: "start_end_frame",
              purpose: "Escalation",
              visual: "Rin stops under a torn awning and scans the alley.",
              subject: "Rin",
              action: "She turns and tightens her grip on the satchel.",
              dialogue: null,
              os: "她意识到情况不对",
              audio: "远处铁门晃动",
              transitionHint: "hold on her glance",
              continuityNotes: "Keep the awning and satchel continuity.",
            },
          ],
        },
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
            visual: "Rin crosses the flooded market.",
            subject: "Rin",
            action: "She advances toward the camera.",
            dialogue: "有人先到了",
            os: null,
            audio: "雨声不断",
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
            frameDependency: "start_end_frame",
            purpose: "Escalation",
            visual: "Rin stops under a torn awning and scans the alley.",
            subject: "Rin",
            action: "She turns and tightens her grip on the satchel.",
            dialogue: null,
            os: "她意识到情况不对",
            audio: "远处铁门晃动",
            transitionHint: "hold on her glance",
            continuityNotes: "Keep the awning and satchel continuity.",
          },
        ],
        shot: {
          id: "shot_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 1,
          shotCode: "SC01-SG01-SH01",
          durationSec: 3,
          frameDependency: "start_frame_only",
          purpose: "Arrival",
          visual: "Rin crosses the flooded market.",
          subject: "Rin",
          action: "She advances toward the camera.",
          dialogue: "有人先到了",
          os: null,
          audio: "雨声不断",
          transitionHint: null,
          continuityNotes: "Keep her satchel visible.",
        },
        startFrame: {
          id: "frame_start_1",
          imageAssetPath:
            "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
        },
        endFrame: {
          id: "frame_end_2",
          imageAssetPath:
            "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_2/end-frame/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
        },
        referenceImages: [
          {
            id: "ref_img_1",
            sourceShotId: "shot_1",
            assetPath:
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
            source: "auto",
            order: 0,
            label: "Shot 1 start frame",
          },
          {
            id: "ref_img_2",
            sourceShotId: "shot_2",
            assetPath:
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_2/end-frame/current.png",
            source: "auto",
            order: 1,
            label: "Shot 2 end frame",
          },
        ],
        referenceAudios: [
          {
            id: "ref_audio_1",
            assetPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/references/audios/rain-guide.wav",
            source: "manual",
            order: 0,
            label: "Rain guide",
            durationSec: 8,
          },
        ],
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
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      segmentName: "Arrival",
      segmentSummary: "Rin arrives at the flooded market.",
      shotCount: 2,
      sourceShotIds: ["shot_1", "shot_2"],
      status: "generating" as const,
      promptTextSeed: "seed prompt",
      promptTextCurrent: "seed prompt",
      promptUpdatedAt: "2026-03-25T00:12:00.000Z",
      referenceImages: [
        {
          id: "ref_img_1",
          sourceShotId: "shot_1",
          assetPath:
            "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
          source: "auto",
          order: 0,
          label: "Shot 1 start frame",
        },
        {
          id: "ref_img_2",
          sourceShotId: "shot_2",
          assetPath:
            "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_2/end-frame/current.png",
          source: "auto",
          order: 1,
          label: "Shot 2 end frame",
        },
      ],
      referenceAudios: [
        {
          id: "ref_audio_1",
          assetPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/references/audios/rain-guide.wav",
          source: "manual",
          order: 0,
          label: "Rain guide",
          durationSec: 8,
        },
      ],
      videoAssetPath: null,
      thumbnailAssetPath: null,
      durationSec: 8,
      provider: null,
      model: null,
      updatedAt: "2026-03-25T00:12:00.000Z",
      approvedAt: null,
      sourceTaskId: null,
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      shotOrder: 1,
      frameDependency: "start_frame_only" as const,
      storageDir: "projects/proj_1-my-story/videos/batches/video_batch_v1/segments/scene_1__segment_1",
      currentVideoRelPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/current.mp4",
      currentMetadataRelPath:
        "videos/batches/video_batch_v1/segments/scene_1__segment_1/current.json",
      thumbnailRelPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/thumbnail.webp",
      versionsStorageDir: "videos/batches/video_batch_v1/segments/scene_1__segment_1/versions",
    };
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn().mockResolvedValue([
        {
          id: "video_segment_record_1",
          status: "generating",
        },
      ]),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn(),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn().mockResolvedValue(currentSegment),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn().mockResolvedValue(currentSegment),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentIdAndShotId:
        vi.fn().mockResolvedValue(currentSegment),
      updateSegment: vi.fn(),
    };
    const shotImageRepository = {
      listShotsByBatchId: vi.fn().mockResolvedValue([]),
    } as any;
    const shotScriptStorage = {
      readCurrentShotScript: vi.fn(),
    } as any;
    const videoStorage = {
      writePromptPlan: vi.fn(),
    } as any;
    const videoPromptProvider = {
      generateVideoPrompt: vi.fn().mockResolvedValue({
        finalPrompt: "以<<<image_1>>>为首帧锚点，林夏涉水前行并说：有人先到了。",
        dialoguePlan: "林夏有口型台词：有人先到了。",
        audioPlan: "持续雨声和涉水声。",
        visualGuardrails: "保持挎包和服装一致。",
        rationale: "把对白、动作和雨声直接揉进单镜头提示词。",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        rawResponse: "{\"finalPrompt\":\"...\"}",
      }),
    };
    const taskQueue = { enqueue: vi.fn() };
    const taskIdGenerator = { generateTaskId: vi.fn().mockReturnValue("task_segment_video_1") };

    const useCase = createProcessSegmentVideoPromptGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotScriptStorage,
      shotImageRepository,
      videoRepository,
      videoStorage,
      videoPromptProvider,
      taskQueue,
      taskIdGenerator,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-25T00:12:30.000Z")
          .mockReturnValueOnce("2026-03-25T00:13:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_segment_video_prompt_1" });

    const providerInput = vi.mocked(videoPromptProvider.generateVideoPrompt).mock.calls[0]?.[0];

    expect(providerInput).toEqual(
      expect.objectContaining({
        projectId: "proj_1",
        segment: expect.objectContaining({
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          name: "Arrival",
          summary: "Rin arrives at the flooded market.",
          durationSec: 8,
          shotCount: 2,
        }),
        shots: [
          expect.objectContaining({
            id: "shot_1",
            shotCode: "SC01-SG01-SH01",
            dialogue: "有人先到了",
          }),
          expect.objectContaining({
            id: "shot_2",
            shotCode: "SC01-SG01-SH02",
            os: "她意识到情况不对",
          }),
        ],
        referenceImages: [
          expect.objectContaining({
            id: "ref_img_1",
            sourceShotId: "shot_1",
            source: "auto",
          }),
          expect.objectContaining({
            id: "ref_img_2",
            sourceShotId: "shot_2",
            source: "auto",
          }),
        ],
        referenceAudios: [
          expect.objectContaining({
            id: "ref_audio_1",
            label: "Rain guide",
          }),
        ],
        startFrame: {
          imageAssetPath:
            "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
          width: 1024,
          height: 1024,
        },
        endFrame: {
          imageAssetPath:
            "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_2/end-frame/current.png",
          width: 1024,
          height: 1024,
        },
      }),
    );
    expect(videoRepository.updateSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "video_segment_record_1",
        status: "in_review",
        promptTextCurrent: "以<<<image_1>>>为首帧锚点，林夏涉水前行并说：有人先到了。",
        updatedAt: "2026-03-25T00:12:30.000Z",
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "videos_in_review",
      updatedAt: "2026-03-25T00:13:00.000Z",
    });
    expect(videoStorage.writePromptPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        segment: expect.objectContaining({
          id: "video_segment_record_1",
          segmentId: "segment_1",
          shotCount: 2,
        }),
        planning: expect.objectContaining({
          provider: "gemini",
          dialoguePlan: "林夏有口型台词：有人先到了。",
        }),
      }),
    );
    expect(taskRepository.insert).not.toHaveBeenCalled();
    expect(taskFileStorage.createTaskArtifacts).not.toHaveBeenCalled();
    expect(taskQueue.enqueue).not.toHaveBeenCalled();
  });

  it("keeps the project in videos_generating when another segment in the batch is still generating", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_segment_video_prompt_2",
        projectId: "proj_1",
        type: "segment_video_prompt_generate",
        queueName: "segment-video-prompt-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_segment_video_prompt_2",
        inputRelPath: "tasks/task_segment_video_prompt_2/input.json",
        outputRelPath: "tasks/task_segment_video_prompt_2/output.json",
        logRelPath: "tasks/task_segment_video_prompt_2/log.txt",
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
        taskId: "task_segment_video_prompt_2",
        projectId: "proj_1",
        taskType: "segment_video_prompt_generate",
        batchId: "video_batch_v1",
        sourceImageBatchId: "image_batch_v1",
        sourceShotScriptId: "shot_script_v1",
        sceneId: "scene_1",
        segmentId: "segment_1",
        shotId: "shot_1",
        shotCode: "SC01-SG01-SH01",
        frameDependency: "start_frame_only",
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
              shotCode: "SC01-SG01-SH01",
              durationSec: 3,
              frameDependency: "start_frame_only",
              purpose: "Arrival",
              visual: "Rin crosses the flooded market.",
              subject: "Rin",
              action: "She advances toward the camera.",
              dialogue: "有人先到了",
              os: null,
              audio: "雨声不断",
              transitionHint: null,
              continuityNotes: "Keep her satchel visible.",
            },
          ],
        },
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
            visual: "Rin crosses the flooded market.",
            subject: "Rin",
            action: "She advances toward the camera.",
            dialogue: "有人先到了",
            os: null,
            audio: "雨声不断",
            transitionHint: null,
            continuityNotes: "Keep her satchel visible.",
          },
        ],
        shot: {
          id: "shot_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 1,
          shotCode: "SC01-SG01-SH01",
          durationSec: 3,
          frameDependency: "start_frame_only",
          purpose: "Arrival",
          visual: "Rin crosses the flooded market.",
          subject: "Rin",
          action: "She advances toward the camera.",
          dialogue: "有人先到了",
          os: null,
          audio: "雨声不断",
          transitionHint: null,
          continuityNotes: "Keep her satchel visible.",
        },
        startFrame: {
          id: "frame_start_1",
          imageAssetPath:
            "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
        },
        endFrame: null,
        referenceImages: [],
        referenceAudios: [],
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
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      segmentName: "Arrival",
      segmentSummary: "Rin arrives at the flooded market.",
      shotCount: 1,
      sourceShotIds: ["shot_1"],
      status: "generating" as const,
      promptTextSeed: "seed prompt",
      promptTextCurrent: "seed prompt",
      promptUpdatedAt: "2026-03-25T00:12:00.000Z",
      referenceImages: [],
      referenceAudios: [],
      videoAssetPath: null,
      thumbnailAssetPath: null,
      durationSec: 8,
      provider: null,
      model: null,
      updatedAt: "2026-03-25T00:12:00.000Z",
      approvedAt: null,
      sourceTaskId: null,
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      shotOrder: 1,
      frameDependency: "start_frame_only" as const,
      storageDir: "projects/proj_1-my-story/videos/batches/video_batch_v1/segments/scene_1__segment_1",
      currentVideoRelPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/current.mp4",
      currentMetadataRelPath:
        "videos/batches/video_batch_v1/segments/scene_1__segment_1/current.json",
      thumbnailRelPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/thumbnail.webp",
      versionsStorageDir: "videos/batches/video_batch_v1/segments/scene_1__segment_1/versions",
    };
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn().mockResolvedValue([
        {
          id: "video_segment_record_1",
          status: "generating",
        },
        {
          id: "video_segment_record_2",
          status: "generating",
        },
      ]),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn(),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn().mockResolvedValue(currentSegment),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn().mockResolvedValue(currentSegment),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentIdAndShotId:
        vi.fn().mockResolvedValue(currentSegment),
      updateSegment: vi.fn(),
    };
    const videoStorage = {
      writePromptPlan: vi.fn(),
    } as any;
    const videoPromptProvider = {
      generateVideoPrompt: vi.fn().mockResolvedValue({
        finalPrompt: "新的 segment prompt",
        dialoguePlan: "dialogue",
        audioPlan: "audio",
        visualGuardrails: "guardrails",
        rationale: "rationale",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        rawResponse: "{\"finalPrompt\":\"...\"}",
      }),
    };
    const taskQueue = { enqueue: vi.fn() };
    const taskIdGenerator = { generateTaskId: vi.fn().mockReturnValue("task_segment_video_2") };

    const useCase = createProcessSegmentVideoPromptGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotScriptStorage: {
        readCurrentShotScript: vi.fn(),
      } as any,
      shotImageRepository: {
        listShotsByBatchId: vi.fn().mockResolvedValue([]),
      } as any,
      videoRepository,
      videoStorage,
      videoPromptProvider,
      taskQueue,
      taskIdGenerator,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-25T00:12:30.000Z")
          .mockReturnValueOnce("2026-03-25T00:13:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_segment_video_prompt_2" });

    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "videos_generating",
      updatedAt: "2026-03-25T00:13:00.000Z",
    });
  });
});
