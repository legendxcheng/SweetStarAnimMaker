import { describe, expect, it, vi } from "vitest";

import { createProcessShotScriptSegmentGenerateTaskUseCase } from "../src/use-cases/process-shot-script-segment-generate-task";

describe("process shot script segment generate task use case", () => {
  it("updates only the targeted segment and promotes it to in_review", async () => {
    const taskRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "task_segment_1",
        projectId: "proj_1",
        type: "shot_script_segment_generate",
        queueName: "shot-script-segment-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_segment_1",
      }),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const projectRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        storageDir: "projects/proj_1-my-story",
        status: "shot_script_generating",
      }),
      updateStatus: vi.fn(),
    };
    const taskFileStorage = {
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_segment_1",
        projectId: "proj_1",
        taskType: "shot_script_segment_generate",
        sourceStoryboardId: "storyboard_1",
        sourceShotScriptId: "shot_script_task_batch_1",
        sceneId: "scene_1",
        segmentId: "segment_1",
        scene: {
          id: "scene_1",
          order: 1,
          name: "集市入口",
          dramaticPurpose: "封死主角退路。",
        },
        segment: {
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
        storyboardTitle: "第1集",
        episodeTitle: "暴雨封路",
        promptTemplateKey: "shot_script.segment.generate",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotScriptStorage = {
      readPromptTemplate: vi.fn().mockResolvedValue("{{segment.visual}}"),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      readCurrentShotScript: vi.fn().mockResolvedValue({
        id: "shot_script_task_batch_1",
        title: "第1集",
        sourceStoryboardId: "storyboard_1",
        sourceTaskId: "task_batch_1",
        updatedAt: "2026-03-23T12:03:00.000Z",
        approvedAt: null,
        segmentCount: 2,
        shotCount: 0,
        totalDurationSec: null,
        segments: [
          {
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            name: null,
            summary: "确认对手先一步堵路。",
            durationSec: 6,
            status: "pending",
            lastGeneratedAt: null,
            approvedAt: null,
            shots: [],
          },
          {
            segmentId: "segment_2",
            sceneId: "scene_1",
            order: 2,
            name: null,
            summary: "压迫主角做出反应。",
            durationSec: 5,
            status: "pending",
            lastGeneratedAt: null,
            approvedAt: null,
            shots: [],
          },
        ],
      }),
      writeCurrentShotScript: vi.fn(),
    };
    const shotScriptProvider = {
      generateShotScriptSegment: vi.fn().mockResolvedValue({
        rawResponse: "{\"segmentId\":\"segment_1\"}",
        segment: {
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          name: "集市压境",
          summary: "林夏确认对手已经堵住出口。",
          durationSec: 6,
          status: "in_review",
          lastGeneratedAt: null,
          approvedAt: null,
          shots: [
            {
              id: "shot_1",
              sceneId: "scene_1",
              segmentId: "segment_1",
              order: 1,
              shotCode: "S01-SG01-SH01",
              durationSec: 2,
              purpose: "先交代主角被堵在集市入口。",
              visual: "清晨积水漫过青石路。",
              subject: "林夏站在水线边。",
              action: "她停住脚步。",
              dialogue: "无",
              os: "来得比我还快。",
              audio: "雨声、水声。",
              transitionHint: "切近景。",
              continuityNotes: "布包在左肩。",
            },
          ],
        },
      }),
    };

    const useCase = createProcessShotScriptSegmentGenerateTaskUseCase({
      taskRepository: taskRepository as never,
      projectRepository: projectRepository as never,
      taskFileStorage: taskFileStorage as never,
      shotScriptProvider: shotScriptProvider as never,
      shotScriptStorage: shotScriptStorage as never,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-23T12:04:00.000Z")
          .mockReturnValueOnce("2026-03-23T12:05:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_segment_1" });

    expect(shotScriptProvider.generateShotScriptSegment).toHaveBeenCalledWith({
      promptText: "积水集市口被杂乱摊棚堵住。",
      variables: expect.objectContaining({
        segment: expect.objectContaining({ id: "segment_1" }),
      }),
    });
    expect(shotScriptStorage.writeCurrentShotScript).toHaveBeenCalledWith({
      storageDir: "projects/proj_1-my-story",
      shotScript: expect.objectContaining({
        shotCount: 1,
        segments: [
          expect.objectContaining({
            segmentId: "segment_1",
            status: "in_review",
            shots: [expect.objectContaining({ shotCode: "S01-SG01-SH01" })],
          }),
          expect.objectContaining({ segmentId: "segment_2", status: "pending" }),
        ],
      }),
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "shot_script_in_review",
      updatedAt: "2026-03-23T12:05:00.000Z",
    });
  });
});
