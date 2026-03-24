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
        characterSheets: [
          {
            characterId: "char_linxia",
            characterName: "林夏",
            promptTextCurrent: "短发，深蓝雨衣，肩背旧布包。",
            imageAssetPath: "character-sheets/char_linxia/current.png",
          },
        ],
        promptTemplateKey: "shot_script.segment.generate",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotScriptStorage = {
      readPromptTemplate: vi.fn().mockResolvedValue(
        [
          "已批准角色设定",
          "{{characterSheets}}",
          "{{segment.visual}}",
        ].join("\n"),
      ),
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
      promptText: expect.stringContaining("标准角色名：林夏"),
      variables: expect.objectContaining({
        segment: expect.objectContaining({ id: "segment_1" }),
        characterSheets: [
          expect.objectContaining({
            characterName: "林夏",
          }),
        ],
      }),
    });
    expect(shotScriptStorage.writePromptSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        promptText: expect.stringContaining("当前造型：短发，深蓝雨衣，肩背旧布包。"),
      }),
    );
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

  it("updates the matching scene segment when raw segment ids repeat", async () => {
    const taskRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "task_segment_2",
        projectId: "proj_1",
        type: "shot_script_segment_generate",
        queueName: "shot-script-segment-generate",
        storageDir: "projects/proj_1-my-story/tasks/task_segment_2",
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
        taskId: "task_segment_2",
        projectId: "proj_1",
        taskType: "shot_script_segment_generate",
        sourceStoryboardId: "storyboard_1",
        sourceShotScriptId: "shot_script_task_batch_1",
        sceneId: "scene_2",
        segmentId: "segment_1",
        scene: {
          id: "scene_2",
          order: 2,
          name: "废站台",
          dramaticPurpose: "逼主角转向。",
        },
        segment: {
          id: "segment_1",
          order: 1,
          durationSec: 5,
          visual: "第二场原始分镜。",
          characterAction: "回头。",
          dialogue: "",
          voiceOver: "",
          audio: "广播杂音。",
          purpose: "更新第二场。",
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
            name: "第一场",
            summary: "保留第一场。",
            durationSec: 6,
            status: "pending",
            lastGeneratedAt: null,
            approvedAt: null,
            shots: [],
          },
          {
            segmentId: "segment_1",
            sceneId: "scene_2",
            order: 1,
            name: "第二场",
            summary: "等待更新。",
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
          sceneId: "scene_2",
          order: 1,
          name: "第二场新稿",
          summary: "只更新第二场。",
          durationSec: 5,
          status: "in_review",
          lastGeneratedAt: null,
          approvedAt: null,
          shots: [
            {
              id: "shot_scene_2",
              sceneId: "scene_2",
              segmentId: "segment_1",
              order: 1,
              shotCode: "S02-SG01-SH01",
              durationSec: 5,
              purpose: "第二场。",
              visual: "第二场新镜头。",
              subject: "林夏",
              action: "回头。",
              dialogue: null,
              os: null,
              audio: "广播杂音。",
              transitionHint: null,
              continuityNotes: null,
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

    await useCase.execute({ taskId: "task_segment_2" });

    expect(shotScriptStorage.writeCurrentShotScript).toHaveBeenCalledWith({
      storageDir: "projects/proj_1-my-story",
      shotScript: expect.objectContaining({
        segments: [
          expect.objectContaining({
            sceneId: "scene_1",
            segmentId: "segment_1",
            name: "第一场",
            status: "pending",
          }),
          expect.objectContaining({
            sceneId: "scene_2",
            segmentId: "segment_1",
            name: "第二场新稿",
            status: "in_review",
            shots: [expect.objectContaining({ shotCode: "S02-SG01-SH01" })],
          }),
        ],
      }),
    });
  });
});
