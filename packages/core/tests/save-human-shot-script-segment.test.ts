import { describe, expect, it, vi } from "vitest";

import { createSaveHumanShotScriptSegmentUseCase } from "../src/use-cases/save-human-shot-script-segment";

describe("save human shot script segment use case", () => {
  it("updates only the selected segment, writes a human version, and keeps review open", async () => {
    const projectRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        storageDir: "projects/proj_1-my-story",
      }),
      updateStatus: vi.fn(),
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
            name: null,
            summary: "旧摘要",
            durationSec: 6,
            status: "in_review",
            lastGeneratedAt: "2026-03-23T12:00:00.000Z",
            approvedAt: null,
            shots: [],
          },
          {
            segmentId: "segment_2",
            sceneId: "scene_1",
            order: 2,
            name: "保留段",
            summary: "不要被覆盖",
            durationSec: 4,
            status: "approved",
            lastGeneratedAt: "2026-03-23T12:00:00.000Z",
            approvedAt: "2026-03-23T12:01:00.000Z",
            shots: [
              {
                id: "shot_keep",
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
      writeShotScriptVersion: vi.fn(),
      writeCurrentShotScript: vi.fn(),
    };
    const useCase = createSaveHumanShotScriptSegmentUseCase({
      projectRepository: projectRepository as never,
      shotScriptStorage: shotScriptStorage as never,
      clock: {
        now: () => "2026-03-23T12:10:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
      segmentId: "segment_1",
      name: "雨市压境",
      summary: "林夏确认退路被封。",
      durationSec: 6,
      shots: [
        {
          id: "shot_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 1,
          shotCode: "SC01-SG01-SH01",
          durationSec: 6,
          purpose: "重写第一段。",
          visual: "雨市入口被堵死。",
          subject: "林夏",
          action: "停住脚步。",
          dialogue: null,
          os: "来得真快。",
          audio: "雨声。",
          transitionHint: null,
          continuityNotes: "布包在左肩。",
        },
      ],
    });

    expect(shotScriptStorage.writeShotScriptVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "human",
      }),
    );
    expect(shotScriptStorage.writeCurrentShotScript).toHaveBeenCalledWith({
      storageDir: "projects/proj_1-my-story",
      shotScript: expect.objectContaining({
        shotCount: 2,
        segments: [
          expect.objectContaining({
            segmentId: "segment_1",
            name: "雨市压境",
            shots: [expect.objectContaining({ shotCode: "SC01-SG01-SH01" })],
          }),
          expect.objectContaining({
            segmentId: "segment_2",
            name: "保留段",
          }),
        ],
      }),
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "shot_script_in_review",
      updatedAt: "2026-03-23T12:10:00.000Z",
    });
    expect(result.segments[1]?.name).toBe("保留段");
  });

  it("updates only the matching scene segment when raw segment ids repeat", async () => {
    const projectRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        storageDir: "projects/proj_1-my-story",
      }),
      updateStatus: vi.fn(),
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
        shotCount: 1,
        totalDurationSec: 5,
        segments: [
          {
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            name: "场景一",
            summary: "不要改我",
            durationSec: 5,
            status: "in_review",
            lastGeneratedAt: "2026-03-23T12:00:00.000Z",
            approvedAt: null,
            shots: [],
          },
          {
            segmentId: "segment_1",
            sceneId: "scene_2",
            order: 1,
            name: "场景二",
            summary: "旧摘要",
            durationSec: 5,
            status: "in_review",
            lastGeneratedAt: "2026-03-23T12:00:00.000Z",
            approvedAt: null,
            shots: [],
          },
        ],
      }),
      writeShotScriptVersion: vi.fn(),
      writeCurrentShotScript: vi.fn(),
    };
    const useCase = createSaveHumanShotScriptSegmentUseCase({
      projectRepository: projectRepository as never,
      shotScriptStorage: shotScriptStorage as never,
      clock: {
        now: () => "2026-03-23T12:10:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
      segmentId: "scene_2:segment_1",
      name: "场景二新稿",
      summary: "只更新第二场。",
      durationSec: 7,
      shots: [
        {
          id: "shot_scene_2",
          sceneId: "scene_2",
          segmentId: "segment_1",
          order: 1,
          shotCode: "SC02-SG01-SH01",
          durationSec: 7,
          purpose: "只改第二场。",
          visual: "第二场新画面。",
          subject: "林夏",
          action: "转身。",
          dialogue: null,
          os: null,
          audio: "风声。",
          transitionHint: null,
          continuityNotes: null,
        },
      ],
    });

    expect(result.segments).toEqual([
      expect.objectContaining({
        sceneId: "scene_1",
        segmentId: "segment_1",
        name: "场景一",
        summary: "不要改我",
      }),
      expect.objectContaining({
        sceneId: "scene_2",
        segmentId: "segment_1",
        name: "场景二新稿",
        summary: "只更新第二场。",
        durationSec: 7,
      }),
    ]);
    expect(shotScriptStorage.writeShotScriptVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        versionId: expect.stringContaining("scene_2"),
      }),
    );
  });

  it("rejects ambiguous raw segment ids when multiple scenes share the same segment id", async () => {
    const projectRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        storageDir: "projects/proj_1-my-story",
      }),
      updateStatus: vi.fn(),
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
            name: "场景一",
            summary: "第一场",
            durationSec: 5,
            status: "in_review",
            lastGeneratedAt: "2026-03-23T12:00:00.000Z",
            approvedAt: null,
            shots: [],
          },
          {
            segmentId: "segment_1",
            sceneId: "scene_2",
            order: 1,
            name: "场景二",
            summary: "第二场",
            durationSec: 5,
            status: "in_review",
            lastGeneratedAt: "2026-03-23T12:00:00.000Z",
            approvedAt: null,
            shots: [],
          },
        ],
      }),
      writeShotScriptVersion: vi.fn(),
      writeCurrentShotScript: vi.fn(),
    };
    const useCase = createSaveHumanShotScriptSegmentUseCase({
      projectRepository: projectRepository as never,
      shotScriptStorage: shotScriptStorage as never,
      clock: {
        now: () => "2026-03-23T12:10:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_1",
        segmentId: "segment_1",
        name: "新稿",
        summary: "不应命中任意一场。",
        durationSec: 5,
        shots: [],
      }),
    ).rejects.toThrow("Ambiguous shot script segment selector: segment_1");
    expect(shotScriptStorage.writeShotScriptVersion).not.toHaveBeenCalled();
    expect(shotScriptStorage.writeCurrentShotScript).not.toHaveBeenCalled();
  });
});
