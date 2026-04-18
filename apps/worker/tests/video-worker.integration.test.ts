import {
  createProcessSegmentVideoGenerateTaskUseCase,
  segmentVideoPromptGenerateQueueName,
  segmentVideoGenerateQueueName,
  videosGenerateQueueName,
} from "@sweet-star/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createConfiguredVideoProvider } from "../src/bootstrap/video-provider-config";
import { startWorker } from "../src/index";

describe("video worker integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("routes video queue task ids into the corresponding process use cases", async () => {
    const processMasterPlotGenerateTask = { execute: vi.fn() };
    const processStoryboardGenerateTask = { execute: vi.fn() };
    const processCharacterSheetsGenerateTask = { execute: vi.fn() };
    const processCharacterSheetGenerateTask = { execute: vi.fn() };
    const processVideosGenerateTask = { execute: vi.fn() };
    const processSegmentVideoPromptGenerateTask = { execute: vi.fn() };
    const processSegmentVideoGenerateTask = { execute: vi.fn() };
    const close = vi.fn();
    const workerFactory = vi.fn(({ processor }) => ({
      processor,
      close,
    }));

    const worker = await startWorker({
      services: {
        processMasterPlotGenerateTask,
        processStoryboardGenerateTask,
        processCharacterSheetsGenerateTask,
        processCharacterSheetGenerateTask,
        processVideosGenerateTask,
        processSegmentVideoPromptGenerateTask,
        processSegmentVideoGenerateTask,
      },
      workerFactory,
    });

    const videosWorkerIndex = workerFactory.mock.calls.findIndex(
      ([input]) => input.queueName === videosGenerateQueueName,
    );
    const promptWorkerIndex = workerFactory.mock.calls.findIndex(
      ([input]) => input.queueName === segmentVideoPromptGenerateQueueName,
    );
    const segmentWorkerIndex = workerFactory.mock.calls.findIndex(
      ([input]) => input.queueName === segmentVideoGenerateQueueName,
    );
    const videosWorker = workerFactory.mock.results[videosWorkerIndex]?.value as {
      processor(job: { data: { taskId: string } }): Promise<void>;
    };
    const promptWorker = workerFactory.mock.results[promptWorkerIndex]?.value as {
      processor(job: { data: { taskId: string } }): Promise<void>;
    };
    const segmentWorker = workerFactory.mock.results[segmentWorkerIndex]?.value as {
      processor(job: { data: { taskId: string } }): Promise<void>;
    };

    await videosWorker.processor({
      data: {
        taskId: "task_videos_batch_1",
      },
    });
    await promptWorker.processor({
      data: {
        taskId: "task_video_prompt_1",
      },
    });
    await segmentWorker.processor({
      data: {
        taskId: "task_video_segment_1",
      },
    });

    expect(workerFactory).toHaveBeenCalledWith(
      expect.objectContaining({ queueName: videosGenerateQueueName }),
    );
    expect(workerFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: segmentVideoPromptGenerateQueueName,
        concurrency: 20,
      }),
    );
    expect(workerFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: segmentVideoGenerateQueueName,
        concurrency: 10,
      }),
    );
    expect(workerFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: videosGenerateQueueName,
        concurrency: 1,
      }),
    );
    expect(processVideosGenerateTask.execute).toHaveBeenCalledWith({
      taskId: "task_videos_batch_1",
    });
    expect(processSegmentVideoPromptGenerateTask.execute).toHaveBeenCalledWith({
      taskId: "task_video_prompt_1",
    });
    expect(processSegmentVideoGenerateTask.execute).toHaveBeenCalledWith({
      taskId: "task_video_segment_1",
    });

    await worker.close();

    expect(close).toHaveBeenCalledTimes(workerFactory.mock.calls.length);
  });

  it("routes segment video generation through Seedance with stored segment references instead of frame-pair-only inputs", async () => {
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cgt-seedance-worker",
          status: "queued",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cgt-seedance-worker",
          status: "succeeded",
          content: {
            video_url: "https://cdn.example/seedance-output.mp4",
            last_frame_url: "https://cdn.example/seedance-last-frame.png",
          },
          duration: 8,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

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
              frameDependency: "start_frame_only",
              purpose: "Escalation",
              visual: "Rin scans the alley under the torn awning.",
              subject: "Rin",
              action: "She tightens her grip on the satchel.",
              dialogue: null,
              os: "她意识到情况不对",
              audio: "远处铁门晃动",
              transitionHint: null,
              continuityNotes: "Keep the awning and satchel continuity.",
            },
          ],
        },
        shots: [],
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
          id: "legacy_start_frame",
          imageAssetPath: "legacy/start-frame.png",
          imageWidth: 1024,
          imageHeight: 1024,
        },
        endFrame: null,
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
      promptTextCurrent: "Seedance 连续片段提示词",
      promptUpdatedAt: "2026-03-25T00:12:00.000Z",
      referenceImages: [
        {
          id: "ref_img_1",
          assetPath: "references/images/segment_1-shot_1-start.png",
          source: "auto" as const,
          order: 0,
          sourceShotId: "shot_1",
          label: "Shot 1 start",
        },
        {
          id: "ref_img_2",
          assetPath: "references/images/segment_1-shot_2-start.png",
          source: "auto" as const,
          order: 1,
          sourceShotId: "shot_2",
          label: "Shot 2 start",
        },
      ],
      referenceAudios: [
        {
          id: "ref_audio_1",
          assetPath: "references/audios/rain-guide.wav",
          source: "manual" as const,
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
      currentMetadataRelPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/current.json",
      thumbnailRelPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/thumbnail.webp",
      versionsStorageDir: "videos/batches/video_batch_v1/segments/scene_1__segment_1/versions",
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
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentIdAndShotId:
        vi.fn().mockResolvedValue(currentSegment),
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
      resolveProjectAssetPath: vi
        .fn()
        .mockImplementation(({ assetRelPath }) => `https://assets.example/${assetRelPath}`),
    };
    const videoProvider = createConfiguredVideoProvider({
      env: {
        SEEDANCE_API_BASE_URL: "https://seedance.example",
        SEEDANCE_API_KEY: "seedance-token",
        SEEDANCE_MODEL: "seedance-test-model",
        SEEDANCE_DURATION_SEC: "8",
        SEEDANCE_ASPECT_RATIO: "9:16",
      },
      referenceImageUploader: {
        uploadReferenceImage: vi.fn(),
      },
    });
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

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://seedance.example/api/v3/contents/generations/tasks",
    );
    expect(request.model).toBe("seedance-test-model");
    expect(request.duration).toBe(8);
    expect(request.ratio).toBe("9:16");
    expect(request.content).toEqual([
      {
        type: "text",
        text: "Seedance 连续片段提示词",
      },
      {
        type: "image_url",
        role: "reference_image",
        image_url: {
          url: "https://assets.example/references/images/segment_1-shot_1-start.png",
        },
      },
      {
        type: "image_url",
        role: "reference_image",
        image_url: {
          url: "https://assets.example/references/images/segment_1-shot_2-start.png",
        },
      },
      {
        type: "audio_url",
        role: "reference_audio",
        audio_url: {
          url: "https://assets.example/references/audios/rain-guide.wav",
        },
      },
    ]);
    expect(JSON.stringify(request.content)).not.toContain("legacy/start-frame.png");
    expect(videoStorage.writePromptSnapshot).toHaveBeenCalledWith({
      taskStorageDir: "projects/proj_1-my-story/tasks/task_segment_video_1",
      promptText: "Seedance 连续片段提示词",
      promptVariables: expect.objectContaining({
        segment: expect.objectContaining({ segmentId: "segment_1" }),
        referenceImages: currentSegment.referenceImages,
        referenceAudios: currentSegment.referenceAudios,
      }),
    });
    expect(videoStorage.writeCurrentVideo).toHaveBeenCalledWith({
      segment: expect.objectContaining({
        id: "video_segment_record_1",
        videoAssetPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/current.mp4",
        thumbnailAssetPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/thumbnail.webp",
        provider: "seedance-video",
        model: "seedance-test-model",
        status: "in_review",
      }),
      videoSourceUrl: "https://cdn.example/seedance-output.mp4",
      thumbnailSourceUrl: "https://cdn.example/seedance-last-frame.png",
      metadata: expect.objectContaining({
        provider: "seedance-video",
        model: "seedance-test-model",
      }),
    });
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[video-generate] starting",
      expect.objectContaining({
        taskId: "task_segment_video_1",
        projectId: "proj_1",
        segmentId: "segment_1",
        referenceImageCount: 2,
        referenceAudioCount: 1,
      }),
    );
  });
});
