import { describe, expect, it, vi } from "vitest";

import { createGetShotScriptReviewUseCase } from "../src/index";

describe("get shot script review use case", () => {
  it("returns the segment-first review workspace for the current shot script", async () => {
    const useCase = createGetShotScriptReviewUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260322_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260322_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 120,
          currentMasterPlotId: "mp_20260322_ab12cd",
          currentCharacterSheetBatchId: "char_batch_v1",
          currentStoryboardId: "storyboard_20260322_ab12cd",
          currentShotScriptId: "shot_script_20260322_ab12cd",
          status: "shot_script_in_review",
          createdAt: "2026-03-22T10:00:00.000Z",
          updatedAt: "2026-03-22T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-22T10:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn().mockResolvedValue({
          id: "shot_script_20260322_ab12cd",
          title: "Episode 1 Shot Script",
          sourceStoryboardId: "storyboard_20260322_ab12cd",
          sourceTaskId: "task_20260322_shot_script",
          updatedAt: "2026-03-22T12:00:00.000Z",
          approvedAt: null,
          segmentCount: 2,
          shotCount: 2,
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
              lastGeneratedAt: "2026-03-22T12:00:00.000Z",
              approvedAt: null,
              shots: [
                {
                  id: "shot_1",
                  sceneId: "scene_1",
                  segmentId: "segment_1",
                  order: 1,
                  shotCode: "SC01-SG01-SH01",
                  durationSec: 3,
                  purpose: "建立堵路信息。",
                  visual: "积水漫过青石路。",
                  subject: "林夏",
                  action: "停住脚步。",
                  dialogue: null,
                  os: "来得真快。",
                  audio: "雨声。",
                  transitionHint: "切近景",
                  continuityNotes: "布包在左肩。",
                },
              ],
            },
            {
              segmentId: "segment_2",
              sceneId: "scene_1",
              order: 2,
              name: "逼近",
              summary: "黑影继续向前。",
              durationSec: 3,
              status: "approved",
              lastGeneratedAt: "2026-03-22T12:01:00.000Z",
              approvedAt: "2026-03-22T12:05:00.000Z",
              shots: [
                {
                  id: "shot_2",
                  sceneId: "scene_1",
                  segmentId: "segment_2",
                  order: 1,
                  shotCode: "SC01-SG02-SH01",
                  durationSec: 3,
                  purpose: "推进压迫感。",
                  visual: "黑影穿过雨帘。",
                  subject: "黑影",
                  action: "继续逼近。",
                  dialogue: null,
                  os: null,
                  audio: "脚步踩水声。",
                  transitionHint: null,
                  continuityNotes: null,
                },
              ],
            },
          ],
        }),
      },
      shotScriptReviewRepository: {
        insert: vi.fn(),
        findLatestByProjectId: vi.fn().mockResolvedValue({
          id: "ssr_20260322_ab12cd",
          projectId: "proj_20260322_ab12cd",
          shotScriptId: "shot_script_20260322_ab12cd",
          action: "reject",
          reason: "第一段需要重生。",
          nextAction: "regenerate",
          triggeredTaskId: "task_20260322_segment_regen",
          createdAt: "2026-03-22T12:05:00.000Z",
        }),
      },
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findLatestByProjectId: vi
          .fn()
          .mockResolvedValueOnce({
            id: "task_20260322_segment_regen",
            projectId: "proj_20260322_ab12cd",
            type: "shot_script_segment_generate",
            status: "pending",
            queueName: "shot-script-segment-generate",
            storageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_20260322_segment_regen",
            inputRelPath: "tasks/task_20260322_segment_regen/input.json",
            outputRelPath: "tasks/task_20260322_segment_regen/output.json",
            logRelPath: "tasks/task_20260322_segment_regen/log.txt",
            errorMessage: null,
            createdAt: "2026-03-22T12:05:00.000Z",
            updatedAt: "2026-03-22T12:05:00.000Z",
            startedAt: null,
            finishedAt: null,
          })
          .mockResolvedValueOnce(null),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260322_ab12cd",
    });

    expect(result.projectStatus).toBe("shot_script_in_review");
    expect(result.projectName).toBe("My Story");
    expect(result.currentShotScript.segmentCount).toBe(2);
    expect(result.latestReview?.nextAction).toBe("regenerate");
    expect(result.latestTask?.type).toBe("shot_script_segment_generate");
    expect(result.availableActions).toEqual({
      saveSegment: true,
      regenerateSegment: true,
      approveSegment: true,
      approveAll: true,
    });
  });

  it("disables approve-all when any segment is still incomplete", async () => {
    const useCase = createGetShotScriptReviewUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260322_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260322_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 120,
          currentMasterPlotId: "mp_20260322_ab12cd",
          currentCharacterSheetBatchId: "char_batch_v1",
          currentStoryboardId: "storyboard_20260322_ab12cd",
          currentShotScriptId: "shot_script_20260322_ab12cd",
          status: "shot_script_in_review",
          createdAt: "2026-03-22T10:00:00.000Z",
          updatedAt: "2026-03-22T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-22T10:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn().mockResolvedValue({
          id: "shot_script_20260322_ab12cd",
          title: "Episode 1 Shot Script",
          sourceStoryboardId: "storyboard_20260322_ab12cd",
          sourceTaskId: "task_20260322_shot_script",
          updatedAt: "2026-03-22T12:00:00.000Z",
          approvedAt: null,
          segmentCount: 2,
          shotCount: 1,
          totalDurationSec: 3,
          segments: [
            {
              segmentId: "segment_1",
              sceneId: "scene_1",
              order: 1,
              name: "雨市压境",
              summary: "林夏确认退路被封。",
              durationSec: 3,
              status: "approved",
              lastGeneratedAt: "2026-03-22T12:00:00.000Z",
              approvedAt: "2026-03-22T12:05:00.000Z",
              shots: [
                {
                  id: "shot_1",
                  sceneId: "scene_1",
                  segmentId: "segment_1",
                  order: 1,
                  shotCode: "SC01-SG01-SH01",
                  durationSec: 3,
                  purpose: "建立堵路信息。",
                  visual: "积水漫过青石路。",
                  subject: "林夏",
                  action: "停住脚步。",
                  dialogue: null,
                  os: "来得真快。",
                  audio: "雨声。",
                  transitionHint: "切近景",
                  continuityNotes: "布包在左肩。",
                },
              ],
            },
            {
              segmentId: "segment_2",
              sceneId: "scene_2",
              order: 1,
              name: null,
              summary: "压出最终悬念。",
              durationSec: 5,
              status: "pending",
              lastGeneratedAt: null,
              approvedAt: null,
              shots: [],
            },
          ],
        }),
      },
      shotScriptReviewRepository: {
        insert: vi.fn(),
        findLatestByProjectId: vi.fn().mockResolvedValue(null),
      },
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findLatestByProjectId: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260322_ab12cd",
    });

    expect(result.availableActions.approveAll).toBe(false);
    expect(result.availableActions.regenerateSegment).toBe(true);
  });

  it("keeps failed segments unapproved without treating them as generating", async () => {
    const useCase = createGetShotScriptReviewUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260322_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260322_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 120,
          currentMasterPlotId: "mp_20260322_ab12cd",
          currentCharacterSheetBatchId: "char_batch_v1",
          currentStoryboardId: "storyboard_20260322_ab12cd",
          currentShotScriptId: "shot_script_20260322_ab12cd",
          status: "shot_script_in_review",
          createdAt: "2026-03-22T10:00:00.000Z",
          updatedAt: "2026-03-22T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-22T10:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn().mockResolvedValue({
          id: "shot_script_20260322_ab12cd",
          title: "Episode 1 Shot Script",
          sourceStoryboardId: "storyboard_20260322_ab12cd",
          sourceTaskId: "task_20260322_shot_script",
          updatedAt: "2026-03-22T12:00:00.000Z",
          approvedAt: null,
          segmentCount: 2,
          shotCount: 1,
          totalDurationSec: 4,
          segments: [
            {
              segmentId: "segment_1",
              sceneId: "scene_1",
              order: 1,
              name: "雨市压境",
              summary: "林夏确认退路被封。",
              durationSec: 4,
              status: "failed",
              lastGeneratedAt: "2026-03-22T12:00:00.000Z",
              approvedAt: null,
              lastErrorMessage: "Gemini shot script provider returned invalid shot script JSON",
              shots: [],
            },
            {
              segmentId: "segment_2",
              sceneId: "scene_2",
              order: 1,
              name: "灯塔回响",
              summary: "林夏听见远处灯塔回音。",
              durationSec: 4,
              status: "in_review",
              lastGeneratedAt: "2026-03-22T12:01:00.000Z",
              approvedAt: null,
              lastErrorMessage: null,
              shots: [
                {
                  id: "shot_2",
                  sceneId: "scene_2",
                  segmentId: "segment_2",
                  order: 1,
                  shotCode: "SC02-SG01-SH01",
                  durationSec: 4,
                  purpose: "建立第二场切入。",
                  visual: "灯塔的光扫过湿冷台阶。",
                  subject: "林夏",
                  action: "林夏停下脚步回头。",
                  frameDependency: "start_frame_only",
                  dialogue: null,
                  os: null,
                  audio: "海浪、风声、机械转动声。",
                  transitionHint: null,
                  continuityNotes: null,
                },
              ],
            },
          ],
        }),
      },
      shotScriptReviewRepository: {
        insert: vi.fn(),
        findLatestByProjectId: vi.fn().mockResolvedValue(null),
      },
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findLatestByProjectId: vi
          .fn()
          .mockResolvedValueOnce({
            id: "task_failed_segment",
            projectId: "proj_20260322_ab12cd",
            type: "shot_script_segment_generate",
            status: "failed",
            queueName: "shot-script-segment-generate",
            storageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_failed_segment",
            inputRelPath: "tasks/task_failed_segment/input.json",
            outputRelPath: "tasks/task_failed_segment/output.json",
            logRelPath: "tasks/task_failed_segment/log.txt",
            errorMessage: "Gemini shot script provider returned invalid shot script JSON",
            createdAt: "2026-03-22T12:05:00.000Z",
            updatedAt: "2026-03-22T12:05:30.000Z",
            startedAt: "2026-03-22T12:05:01.000Z",
            finishedAt: "2026-03-22T12:05:30.000Z",
          })
          .mockResolvedValueOnce(null),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260322_ab12cd",
    });

    expect(result.availableActions.approveAll).toBe(false);
    expect(result.latestTask?.status).toBe("failed");
    expect(result.currentShotScript.segments[0]?.status).toBe("failed");
  });
});
