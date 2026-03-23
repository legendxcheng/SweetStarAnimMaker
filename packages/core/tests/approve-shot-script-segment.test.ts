import { describe, expect, it, vi } from "vitest";

import { createApproveShotScriptSegmentUseCase } from "../src/use-cases/approve-shot-script-segment";

describe("approve shot script segment use case", () => {
  it("approves only the selected segment and keeps project in review until all segments are approved", async () => {
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
          },
          {
            segmentId: "segment_2",
            sceneId: "scene_1",
            order: 2,
            name: "保留段",
            summary: "第二段仍在审核。",
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
    const useCase = createApproveShotScriptSegmentUseCase({
      projectRepository: projectRepository as never,
      shotScriptStorage: shotScriptStorage as never,
      shotScriptReviewRepository: shotScriptReviewRepository as never,
      clock: {
        now: () => "2026-03-23T12:15:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
      segmentId: "segment_1",
    });

    expect(shotScriptStorage.writeCurrentShotScript).toHaveBeenCalledWith({
      storageDir: "projects/proj_1-my-story",
      shotScript: expect.objectContaining({
        approvedAt: null,
        segments: [
          expect.objectContaining({
            segmentId: "segment_1",
            status: "approved",
            approvedAt: "2026-03-23T12:15:00.000Z",
          }),
          expect.objectContaining({
            segmentId: "segment_2",
            status: "in_review",
          }),
        ],
      }),
    });
    expect(shotScriptReviewRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "approve",
        shotScriptId: "shot_script_1",
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "shot_script_in_review",
      updatedAt: "2026-03-23T12:15:00.000Z",
    });
    expect(result.segments[0]?.status).toBe("approved");
  });
});
