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
});
