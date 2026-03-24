import { describe, expect, it, vi } from "vitest";

import { createRegenerateShotScriptSegmentUseCase } from "../src/use-cases/regenerate-shot-script-segment";

describe("regenerate shot script segment use case", () => {
  it("enqueues a single segment generation task and marks only that segment as generating", async () => {
    const projectRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        storageDir: "projects/proj_1-my-story",
      }),
      updateStatus: vi.fn(),
    };
    const storyboardStorage = {
      readCurrentStoryboard: vi.fn().mockResolvedValue({
        id: "storyboard_1",
        title: "第1集",
        episodeTitle: "暴雨封路",
        scenes: [
          {
            id: "scene_1",
            order: 1,
            name: "集市口",
            dramaticPurpose: "封死退路。",
            segments: [
              {
                id: "segment_1",
                order: 1,
                durationSec: 6,
                visual: "积水集市口被摊棚堵住。",
                characterAction: "林夏停步。",
                dialogue: "",
                voiceOver: "来得真快。",
                audio: "雨声。",
                purpose: "确认被堵路。",
              },
            ],
          },
        ],
      }),
    };
    const shotScriptStorage = {
      readCurrentShotScript: vi.fn().mockResolvedValue({
        id: "shot_script_1",
        title: "第1集",
        sourceStoryboardId: "storyboard_1",
        sourceTaskId: "task_batch_1",
        updatedAt: "2026-03-23T12:00:00.000Z",
        approvedAt: null,
        segmentCount: 2,
        shotCount: 2,
        totalDurationSec: 10,
        segments: [
          {
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            name: "雨市压境",
            summary: "待重生。",
            durationSec: 6,
            status: "in_review",
            lastGeneratedAt: "2026-03-23T12:00:00.000Z",
            approvedAt: null,
            shots: [
              {
                id: "shot_1",
                sceneId: "scene_1",
                segmentId: "segment_1",
                order: 1,
                shotCode: "SC01-SG01-SH01",
                durationSec: 6,
                purpose: "旧镜头。",
                visual: "旧画面。",
                subject: "林夏",
                action: "停下。",
                dialogue: null,
                os: null,
                audio: "雨声。",
                transitionHint: null,
                continuityNotes: null,
              },
            ],
          },
          {
            segmentId: "segment_2",
            sceneId: "scene_1",
            order: 2,
            name: "保留段",
            summary: "仍可审核。",
            durationSec: 4,
            status: "approved",
            lastGeneratedAt: "2026-03-23T12:00:00.000Z",
            approvedAt: "2026-03-23T12:01:00.000Z",
            shots: [
              {
                id: "shot_2",
                sceneId: "scene_1",
                segmentId: "segment_2",
                order: 1,
                shotCode: "SC01-SG02-SH01",
                durationSec: 4,
                purpose: "保留镜头。",
                visual: "保留画面。",
                subject: "黑影",
                action: "继续靠近。",
                dialogue: null,
                os: null,
                audio: "脚步声。",
                transitionHint: null,
                continuityNotes: null,
              },
            ],
          },
        ],
      }),
      writeCurrentShotScript: vi.fn(),
    };
    const shotScriptReviewRepository = {
      insert: vi.fn(),
      findLatestByProjectId: vi.fn(),
    };
    const taskRepository = {
      insert: vi.fn(),
      delete: vi.fn(),
      markFailed: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
    };
    const taskQueue = {
      enqueue: vi.fn(),
    };
    const taskIdGenerator = {
      generateTaskId: vi.fn().mockReturnValue("task_segment_regen_1"),
    };
    const useCase = createRegenerateShotScriptSegmentUseCase({
      projectRepository: projectRepository as never,
      storyboardStorage: storyboardStorage as never,
      shotScriptStorage: shotScriptStorage as never,
      shotScriptReviewRepository: shotScriptReviewRepository as never,
      taskRepository: taskRepository as never,
      taskFileStorage: taskFileStorage as never,
      taskQueue: taskQueue as never,
      taskIdGenerator: taskIdGenerator as never,
      clock: {
        now: () => "2026-03-23T12:25:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
      segmentId: "segment_1",
      reason: "第一段节奏不对。",
    });

    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_segment_regen_1",
        type: "shot_script_segment_generate",
      }),
      input: expect.objectContaining({
        segmentId: "segment_1",
        promptTemplateKey: "shot_script.segment.generate",
      }),
    });
    expect(shotScriptStorage.writeCurrentShotScript).toHaveBeenCalledWith({
      storageDir: "projects/proj_1-my-story",
      shotScript: expect.objectContaining({
        segments: [
          expect.objectContaining({
            segmentId: "segment_1",
            status: "generating",
          }),
          expect.objectContaining({
            segmentId: "segment_2",
            status: "approved",
          }),
        ],
      }),
    });
    expect(taskQueue.enqueue).toHaveBeenCalledWith({
      taskId: "task_segment_regen_1",
      queueName: "shot-script-segment-generate",
      taskType: "shot_script_segment_generate",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "shot_script_generating",
      updatedAt: "2026-03-23T12:25:00.000Z",
    });
    expect(result.id).toBe("task_segment_regen_1");
  });

  it("uses the scene-aware selector when raw segment ids repeat", async () => {
    const projectRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        storageDir: "projects/proj_1-my-story",
      }),
      updateStatus: vi.fn(),
    };
    const storyboardStorage = {
      readCurrentStoryboard: vi.fn().mockResolvedValue({
        id: "storyboard_1",
        title: "第1集",
        episodeTitle: "暴雨封路",
        scenes: [
          {
            id: "scene_1",
            order: 1,
            name: "集市口",
            dramaticPurpose: "封死退路。",
            segments: [
              {
                id: "segment_1",
                order: 1,
                durationSec: 6,
                visual: "第一场。",
                characterAction: "停步。",
                dialogue: "",
                voiceOver: "",
                audio: "雨声。",
                purpose: "第一场。",
              },
            ],
          },
          {
            id: "scene_2",
            order: 2,
            name: "废站台",
            dramaticPurpose: "逼主角转向。",
            segments: [
              {
                id: "segment_1",
                order: 1,
                durationSec: 5,
                visual: "第二场。",
                characterAction: "回头。",
                dialogue: "",
                voiceOver: "",
                audio: "广播杂音。",
                purpose: "第二场。",
              },
            ],
          },
        ],
      }),
    };
    const shotScriptStorage = {
      readCurrentShotScript: vi.fn().mockResolvedValue({
        id: "shot_script_1",
        title: "第1集",
        sourceStoryboardId: "storyboard_1",
        sourceTaskId: "task_batch_1",
        updatedAt: "2026-03-23T12:00:00.000Z",
        approvedAt: null,
        segmentCount: 2,
        shotCount: 2,
        totalDurationSec: 11,
        segments: [
          {
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            name: "第一场",
            summary: "保留",
            durationSec: 6,
            status: "approved",
            lastGeneratedAt: "2026-03-23T12:00:00.000Z",
            approvedAt: "2026-03-23T12:01:00.000Z",
            shots: [],
          },
          {
            segmentId: "segment_1",
            sceneId: "scene_2",
            order: 1,
            name: "第二场",
            summary: "应进入 generating",
            durationSec: 5,
            status: "in_review",
            lastGeneratedAt: "2026-03-23T12:00:00.000Z",
            approvedAt: null,
            shots: [],
          },
        ],
      }),
      writeCurrentShotScript: vi.fn(),
    };
    const shotScriptReviewRepository = {
      insert: vi.fn(),
      findLatestByProjectId: vi.fn(),
    };
    const taskRepository = {
      insert: vi.fn(),
      delete: vi.fn(),
      markFailed: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
    };
    const taskQueue = {
      enqueue: vi.fn(),
    };
    const taskIdGenerator = {
      generateTaskId: vi.fn().mockReturnValue("task_segment_regen_2"),
    };
    const useCase = createRegenerateShotScriptSegmentUseCase({
      projectRepository: projectRepository as never,
      storyboardStorage: storyboardStorage as never,
      shotScriptStorage: shotScriptStorage as never,
      shotScriptReviewRepository: shotScriptReviewRepository as never,
      taskRepository: taskRepository as never,
      taskFileStorage: taskFileStorage as never,
      taskQueue: taskQueue as never,
      taskIdGenerator: taskIdGenerator as never,
      clock: {
        now: () => "2026-03-23T12:25:00.000Z",
      },
    });

    await useCase.execute({
      projectId: "proj_1",
      segmentId: "scene_2:segment_1",
    });

    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_segment_regen_2" }),
      input: expect.objectContaining({
        sceneId: "scene_2",
        segmentId: "segment_1",
        segment: expect.objectContaining({
          visual: "第二场。",
        }),
      }),
    });
    expect(shotScriptStorage.writeCurrentShotScript).toHaveBeenCalledWith({
      storageDir: "projects/proj_1-my-story",
      shotScript: expect.objectContaining({
        segments: [
          expect.objectContaining({
            sceneId: "scene_1",
            segmentId: "segment_1",
            status: "approved",
          }),
          expect.objectContaining({
            sceneId: "scene_2",
            segmentId: "segment_1",
            status: "generating",
          }),
        ],
      }),
    });
  });

  it("rejects ambiguous raw segment ids when multiple scenes share the same segment id", async () => {
    const projectRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        storageDir: "projects/proj_1-my-story",
      }),
      updateStatus: vi.fn(),
    };
    const storyboardStorage = {
      readCurrentStoryboard: vi.fn().mockResolvedValue({
        id: "storyboard_1",
        title: "第1集",
        episodeTitle: "暴雨封路",
        scenes: [
          {
            id: "scene_1",
            order: 1,
            name: "第一场",
            dramaticPurpose: "第一场。",
            segments: [
              {
                id: "segment_1",
                order: 1,
                durationSec: 6,
                visual: "第一场。",
                characterAction: "停步。",
                dialogue: "",
                voiceOver: "",
                audio: "雨声。",
                purpose: "第一场。",
              },
            ],
          },
          {
            id: "scene_2",
            order: 2,
            name: "第二场",
            dramaticPurpose: "第二场。",
            segments: [
              {
                id: "segment_1",
                order: 1,
                durationSec: 5,
                visual: "第二场。",
                characterAction: "回头。",
                dialogue: "",
                voiceOver: "",
                audio: "广播杂音。",
                purpose: "第二场。",
              },
            ],
          },
        ],
      }),
    };
    const shotScriptStorage = {
      readCurrentShotScript: vi.fn().mockResolvedValue({
        id: "shot_script_1",
        title: "第1集",
        sourceStoryboardId: "storyboard_1",
        sourceTaskId: "task_batch_1",
        updatedAt: "2026-03-23T12:00:00.000Z",
        approvedAt: null,
        segmentCount: 2,
        shotCount: 0,
        totalDurationSec: null,
        segments: [
          {
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            name: "第一场",
            summary: "第一场",
            durationSec: 6,
            status: "in_review",
            lastGeneratedAt: "2026-03-23T12:00:00.000Z",
            approvedAt: null,
            shots: [],
          },
          {
            segmentId: "segment_1",
            sceneId: "scene_2",
            order: 1,
            name: "第二场",
            summary: "第二场",
            durationSec: 5,
            status: "in_review",
            lastGeneratedAt: "2026-03-23T12:00:00.000Z",
            approvedAt: null,
            shots: [],
          },
        ],
      }),
      writeCurrentShotScript: vi.fn(),
    };
    const shotScriptReviewRepository = {
      insert: vi.fn(),
      findLatestByProjectId: vi.fn(),
    };
    const taskRepository = {
      insert: vi.fn(),
      delete: vi.fn(),
      markFailed: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
    };
    const taskQueue = {
      enqueue: vi.fn(),
    };
    const taskIdGenerator = {
      generateTaskId: vi.fn().mockReturnValue("task_segment_regen_1"),
    };
    const useCase = createRegenerateShotScriptSegmentUseCase({
      projectRepository: projectRepository as never,
      storyboardStorage: storyboardStorage as never,
      shotScriptStorage: shotScriptStorage as never,
      shotScriptReviewRepository: shotScriptReviewRepository as never,
      taskRepository: taskRepository as never,
      taskFileStorage: taskFileStorage as never,
      taskQueue: taskQueue as never,
      taskIdGenerator: taskIdGenerator as never,
      clock: {
        now: () => "2026-03-23T12:25:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_1",
        segmentId: "segment_1",
      }),
    ).rejects.toThrow("Ambiguous shot script segment selector: segment_1");
    expect(taskRepository.insert).not.toHaveBeenCalled();
    expect(shotScriptStorage.writeCurrentShotScript).not.toHaveBeenCalled();
  });
});
