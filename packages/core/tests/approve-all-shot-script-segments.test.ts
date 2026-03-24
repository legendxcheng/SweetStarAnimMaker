import { describe, expect, it, vi } from "vitest";

import { createApproveAllShotScriptSegmentsUseCase } from "../src/use-cases/approve-all-shot-script-segments";

describe("approve all shot script segments use case", () => {
  it("approves all reviewable segments and promotes the project when every segment is approved", async () => {
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
            name: "雨市压境",
            summary: "林夏确认退路被封。",
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
                purpose: "第一段。",
                visual: "雨市入口。",
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
            name: "逼近",
            summary: "第二段。",
            durationSec: 4,
            status: "in_review",
            lastGeneratedAt: "2026-03-23T12:00:00.000Z",
            approvedAt: null,
            shots: [
              {
                id: "shot_2",
                sceneId: "scene_1",
                segmentId: "segment_2",
                order: 1,
                shotCode: "SC01-SG02-SH01",
                durationSec: 4,
                purpose: "第二段。",
                visual: "黑影逼近。",
                subject: "黑影",
                action: "靠近。",
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
    const useCase = createApproveAllShotScriptSegmentsUseCase({
      projectRepository: projectRepository as never,
      shotScriptStorage: shotScriptStorage as never,
      shotScriptReviewRepository: shotScriptReviewRepository as never,
      clock: {
        now: () => "2026-03-23T12:20:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
    });

    expect(shotScriptStorage.writeCurrentShotScript).toHaveBeenCalledWith({
      storageDir: "projects/proj_1-my-story",
      shotScript: expect.objectContaining({
        approvedAt: "2026-03-23T12:20:00.000Z",
      }),
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "shot_script_approved",
      updatedAt: "2026-03-23T12:20:00.000Z",
    });
    expect(result.segments.every((segment) => segment.status === "approved")).toBe(true);
  });

  it("creates a unique review id for each approve-all attempt", async () => {
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
        segmentCount: 1,
        shotCount: 1,
        totalDurationSec: 6,
        segments: [
          {
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            name: "雨市压境",
            summary: "林夏确认退路被封。",
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
                purpose: "第一段。",
                visual: "雨市入口。",
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
        ],
      }),
      writeCurrentShotScript: vi.fn(),
    };
    const shotScriptReviewRepository = {
      insert: vi.fn(),
      findLatestByProjectId: vi.fn(),
    };
    const useCase = createApproveAllShotScriptSegmentsUseCase({
      projectRepository: projectRepository as never,
      shotScriptStorage: shotScriptStorage as never,
      shotScriptReviewRepository: shotScriptReviewRepository as never,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-23T12:20:00.000Z")
          .mockReturnValueOnce("2026-03-23T12:21:00.000Z"),
      },
    });

    await useCase.execute({
      projectId: "proj_1",
    });
    await useCase.execute({
      projectId: "proj_1",
    });

    expect(shotScriptReviewRepository.insert).toHaveBeenCalledTimes(2);
    expect(shotScriptReviewRepository.insert.mock.calls[0]?.[0]?.id).not.toBe(
      shotScriptReviewRepository.insert.mock.calls[1]?.[0]?.id,
    );
  });
});
