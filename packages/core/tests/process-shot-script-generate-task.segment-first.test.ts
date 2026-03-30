import { describe, expect, it, vi } from "vitest";

import { createProcessShotScriptGenerateTaskUseCase } from "../src/use-cases/process-shot-script-generate-task";

describe("process shot script generate task use case - segment first", () => {
  it("creates a grouped shot-script shell and enqueues one segment task per storyboard segment", async () => {
    const taskRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "task_batch_1",
        projectId: "proj_1",
        type: "shot_script_generate",
        queueName: "shot-script-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_batch_1",
      }),
      markRunning: vi.fn(),
      insert: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const projectRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        storageDir: "projects/proj_1-my-story",
        status: "shot_script_generating",
      }),
      updateCurrentShotScript: vi.fn(),
      updateStatus: vi.fn(),
    };
    const taskFileStorage = {
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_batch_1",
        projectId: "proj_1",
        taskType: "shot_script_generate",
        sourceStoryboardId: "storyboard_1",
        storyboard: {
          id: "storyboard_1",
          title: "第1集",
          episodeTitle: "暴雨封路",
          scenes: [
            {
              id: "scene_1",
              order: 1,
              name: "集市入口",
              dramaticPurpose: "封死主角退路。",
              segments: [
                {
                  id: "segment_1",
                  order: 1,
                  durationSec: 6,
                  visual: "积水集市口被杂乱摊棚堵住。",
                  characterAction: "林夏停住脚步。",
                  dialogue: "",
                  voiceOver: "来得真快。",
                  audio: "雨声和水声混在一起。",
                  purpose: "确认对手先一步堵路。",
                },
                {
                  id: "segment_2",
                  order: 2,
                  durationSec: 5,
                  visual: "对手从摊棚后逼近。",
                  characterAction: "堵住出口。",
                  dialogue: "",
                  voiceOver: "",
                  audio: "脚步踩水。",
                  purpose: "压迫主角做出反应。",
                },
              ],
            },
          ],
        },
        promptTemplateKey: "shot_script.segment.generate",
      }),
      createTaskArtifacts: vi.fn(),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotScriptStorage = {
      readCurrentShotScript: vi.fn().mockResolvedValue(null),
      writeCurrentShotScript: vi.fn(),
    };
    const taskQueue = {
      enqueue: vi.fn(),
    };

    const useCase = createProcessShotScriptGenerateTaskUseCase({
      taskRepository: taskRepository as never,
      projectRepository: projectRepository as never,
      taskFileStorage: taskFileStorage as never,
      shotScriptStorage: shotScriptStorage as never,
      taskQueue: taskQueue as never,
      taskIdGenerator: {
        generateTaskId: vi
          .fn()
          .mockReturnValueOnce("task_segment_1")
          .mockReturnValueOnce("task_segment_2"),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-23T12:02:00.000Z")
          .mockReturnValueOnce("2026-03-23T12:03:00.000Z"),
      },
    } as never);

    await useCase.execute({ taskId: "task_batch_1" });

    expect(shotScriptStorage.writeCurrentShotScript).toHaveBeenCalledWith({
      storageDir: "projects/proj_1-my-story",
      shotScript: expect.objectContaining({
        id: "shot_script_task_batch_1",
        segmentCount: 2,
        shotCount: 0,
        segments: [
          expect.objectContaining({ segmentId: "segment_1", status: "pending" }),
          expect.objectContaining({ segmentId: "segment_2", status: "pending" }),
        ],
      }),
    });
    expect(taskRepository.insert).toHaveBeenCalledTimes(2);
    expect(taskQueue.enqueue).toHaveBeenCalledTimes(2);
    expect(taskFileStorage.writeTaskOutput).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_batch_1" }),
      output: {
        shotScriptId: "shot_script_task_batch_1",
        segmentCount: 2,
      },
    });
    expect(taskRepository.markSucceeded).toHaveBeenCalledWith({
      taskId: "task_batch_1",
      updatedAt: "2026-03-23T12:03:00.000Z",
      finishedAt: "2026-03-23T12:03:00.000Z",
    });
  });

  it("preserves approved segments and only enqueues unapproved ones during batch regenerate", async () => {
    const taskRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "task_batch_2",
        projectId: "proj_1",
        type: "shot_script_generate",
        queueName: "shot-script-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_batch_2",
      }),
      markRunning: vi.fn(),
      insert: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const projectRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        storageDir: "projects/proj_1-my-story",
        status: "shot_script_generating",
      }),
      updateCurrentShotScript: vi.fn(),
      updateStatus: vi.fn(),
    };
    const taskFileStorage = {
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_batch_2",
        projectId: "proj_1",
        taskType: "shot_script_generate",
        sourceStoryboardId: "storyboard_1",
        storyboard: {
          id: "storyboard_1",
          title: "第1集",
          episodeTitle: "暴雨封路",
          scenes: [
            {
              id: "scene_1",
              order: 1,
              name: "集市入口",
              dramaticPurpose: "封死主角退路。",
              segments: [
                {
                  id: "segment_1",
                  order: 1,
                  durationSec: 6,
                  visual: "积水集市口被杂乱摊棚堵住。",
                  characterAction: "林夏停住脚步。",
                  dialogue: "",
                  voiceOver: "来得真快。",
                  audio: "雨声和水声混在一起。",
                  purpose: "确认对手先一步堵路。",
                },
                {
                  id: "segment_2",
                  order: 2,
                  durationSec: 5,
                  visual: "对手从摊棚后逼近。",
                  characterAction: "堵住出口。",
                  dialogue: "",
                  voiceOver: "",
                  audio: "脚步踩水。",
                  purpose: "压迫主角做出反应。",
                },
              ],
            },
          ],
        },
        promptTemplateKey: "shot_script.segment.generate",
      }),
      createTaskArtifacts: vi.fn(),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotScriptStorage = {
      readCurrentShotScript: vi.fn().mockResolvedValue({
        id: "shot_script_previous",
        title: "旧版镜头脚本",
        sourceStoryboardId: "storyboard_1",
        sourceTaskId: "task_previous",
        updatedAt: "2026-03-23T12:00:00.000Z",
        approvedAt: null,
        segmentCount: 2,
        shotCount: 2,
        totalDurationSec: 11,
        segments: [
          {
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 1,
            name: "保留段落",
            summary: "已通过段落保留原内容。",
            durationSec: 6,
            status: "approved" as const,
            lastGeneratedAt: "2026-03-23T11:55:00.000Z",
            approvedAt: "2026-03-23T12:00:00.000Z",
            shots: [
              {
                id: "shot_approved_1",
                sceneId: "scene_1",
                segmentId: "segment_1",
                order: 1,
                shotCode: "S01-SG01-SH01",
                purpose: "保留镜头",
                visual: "保留画面",
                subject: "林夏",
                action: "停步",
                frameDependency: "start_frame_only" as const,
                dialogue: null,
                os: null,
                audio: "雨声",
                transitionHint: null,
                continuityNotes: null,
                durationSec: 6,
              },
            ],
          },
          {
            sceneId: "scene_1",
            segmentId: "segment_2",
            order: 2,
            name: "待重跑段落",
            summary: "未通过段落应重跑。",
            durationSec: 5,
            status: "in_review" as const,
            lastGeneratedAt: "2026-03-23T11:56:00.000Z",
            approvedAt: null,
            shots: [
              {
                id: "shot_old_2",
                sceneId: "scene_1",
                segmentId: "segment_2",
                order: 1,
                shotCode: "S01-SG02-SH01",
                purpose: "旧镜头",
                visual: "旧画面",
                subject: "对手",
                action: "逼近",
                frameDependency: "start_frame_only" as const,
                dialogue: null,
                os: null,
                audio: "脚步",
                transitionHint: null,
                continuityNotes: null,
                durationSec: 5,
              },
            ],
          },
        ],
      }),
      writeCurrentShotScript: vi.fn(),
    };
    const taskQueue = {
      enqueue: vi.fn(),
    };

    const useCase = createProcessShotScriptGenerateTaskUseCase({
      taskRepository: taskRepository as never,
      projectRepository: projectRepository as never,
      taskFileStorage: taskFileStorage as never,
      shotScriptStorage: shotScriptStorage as never,
      taskQueue: taskQueue as never,
      taskIdGenerator: {
        generateTaskId: vi.fn().mockReturnValue("task_segment_2"),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-23T12:10:00.000Z")
          .mockReturnValueOnce("2026-03-23T12:11:00.000Z"),
      },
    } as never);

    await useCase.execute({ taskId: "task_batch_2" });

    expect(shotScriptStorage.writeCurrentShotScript).toHaveBeenCalledWith({
      storageDir: "projects/proj_1-my-story",
      shotScript: expect.objectContaining({
        id: "shot_script_task_batch_2",
        segmentCount: 2,
        shotCount: 1,
        segments: [
          expect.objectContaining({
            segmentId: "segment_1",
            status: "approved",
            name: "保留段落",
            shots: [expect.objectContaining({ id: "shot_approved_1" })],
          }),
          expect.objectContaining({
            segmentId: "segment_2",
            status: "pending",
            shots: [],
          }),
        ],
      }),
    });
    expect(taskRepository.insert).toHaveBeenCalledTimes(1);
    expect(taskRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "task_segment_2", type: "shot_script_segment_generate" }),
    );
    expect(taskQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_segment_2" }),
      input: expect.objectContaining({
        segmentId: "segment_2",
      }),
    });
  });
});
