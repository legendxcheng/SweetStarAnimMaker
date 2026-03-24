import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "../../src/services/api-client";
import { config } from "../../src/services/config";

describe("API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("uses VITE_API_BASE_URL from config", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    global.fetch = mockFetch;

    await apiClient.listProjects();

    expect(mockFetch).toHaveBeenCalledWith(
      `${config.apiBaseUrl}/projects`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("converts non-2xx responses to structured errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ message: "Project not found" }),
    });

    await expect(apiClient.getProjectDetail("invalid")).rejects.toEqual(
      expect.objectContaining<ApiError>({
        message: "Project not found",
        status: 404,
        statusText: "Not Found",
      }),
    );
  });

  it("validates JSON responses against shared schemas", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ invalid: "data" }),
    });

    await expect(apiClient.getProjectDetail("proj-1")).rejects.toThrow();
  });

  it("accepts generating shot-script shell responses", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "proj-1",
          name: "Test Project",
          slug: "test-project",
          status: "shot_script_generating",
          storageDir: "/path/to/project",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          premise: {
            path: "premise/v1.md",
            bytes: 42,
            updatedAt: "2024-01-01T00:00:00Z",
            text: "A washed-up pilot discovers a singing comet above a drowned city.",
          },
          currentMasterPlot: null,
          currentCharacterSheetBatch: null,
          currentStoryboard: {
            id: "storyboard-1",
            title: "Episode 1",
            episodeTitle: "Episode 1",
            sourceMasterPlotId: "mp-1",
            sourceTaskId: "task-storyboard-1",
            updatedAt: "2024-01-01T00:00:00Z",
            approvedAt: "2024-01-01T00:00:00Z",
            sceneCount: 1,
            segmentCount: 2,
            totalDurationSec: 12,
          },
          currentShotScript: {
            id: "shot-script-1",
            title: "Episode 1 Shot Script",
            sourceStoryboardId: "storyboard-1",
            sourceTaskId: "task-shot-script-1",
            updatedAt: "2024-01-01T00:00:00Z",
            approvedAt: null,
            segmentCount: 2,
            shotCount: 0,
            totalDurationSec: null,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "shot-script-1",
          title: "Episode 1 Shot Script",
          sourceStoryboardId: "storyboard-1",
          sourceTaskId: "task-shot-script-1",
          updatedAt: "2024-01-01T00:00:00Z",
          approvedAt: null,
          segmentCount: 2,
          shotCount: 0,
          totalDurationSec: null,
          segments: [
            {
              segmentId: "segment-1",
              sceneId: "scene-1",
              order: 1,
              name: null,
              summary: "林夏靠近码头入口。",
              durationSec: 6,
              status: "generating",
              lastGeneratedAt: null,
              approvedAt: null,
              shots: [],
            },
            {
              segmentId: "segment-2",
              sceneId: "scene-1",
              order: 2,
              name: null,
              summary: "远处警笛响起。",
              durationSec: 6,
              status: "pending",
              lastGeneratedAt: null,
              approvedAt: null,
              shots: [],
            },
          ],
        }),
      });
    global.fetch = mockFetch;

    const detail = await apiClient.getProjectDetail("proj-1");
    const current = await apiClient.getCurrentShotScript("proj-1");

    expect(detail.currentShotScript?.shotCount).toBe(0);
    expect(current.shotCount).toBe(0);
    expect(current.segments[0]?.shots).toEqual([]);
  });

  it("does not send a JSON content-type header for POST requests without a body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "task_1",
        projectId: "proj_1",
        type: "storyboard_generate",
        status: "pending",
        createdAt: "2026-03-20T00:00:00.000Z",
        updatedAt: "2026-03-20T00:00:00.000Z",
        startedAt: null,
        finishedAt: null,
        errorMessage: null,
        files: {
          inputPath: "tasks/task_1/input.json",
          outputPath: "tasks/task_1/output.json",
          logPath: "tasks/task_1/log.txt",
        },
      }),
    });
    global.fetch = mockFetch;

    await apiClient.createStoryboardGenerateTask("proj_1");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]?.[0]).toBe(
      `${config.apiBaseUrl}/projects/proj_1/tasks/storyboard-generate`,
    );
    expect(mockFetch.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
      }),
    );
    const headers = mockFetch.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("calls the shot-script endpoints with the expected methods and payloads", async () => {
    const baseSegment = {
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      name: "雨夜码头",
      summary: "林夏在暴雨码头第一次听见异响。",
      durationSec: 6,
      status: "in_review" as const,
      lastGeneratedAt: "2026-03-23T00:00:02.000Z",
      approvedAt: null,
      shots: [
        {
          id: "shot_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 1,
          shotCode: "S01-SG01-SH01",
          purpose: "建立码头空间和危险气氛。",
          visual: "雨水顺着集装箱边缘流下，远处探照灯扫过积水。",
          subject: "林夏",
          action: "林夏撑伞快步走进码头入口。",
          dialogue: null,
          os: "今晚绝不能出错。",
          audio: "暴雨、风声、远处船笛。",
          transitionHint: "硬切入",
          continuityNotes: "黑伞保持右手持伞。",
          durationSec: 3,
        },
        {
          id: "shot_2",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 2,
          shotCode: "S01-SG01-SH02",
          purpose: "把注意力收束到异响来源。",
          visual: "镜头越过林夏肩膀，看向被风掀动的警戒带。",
          subject: "林夏与警戒带",
          action: "林夏停步回头，目光锁定响动方向。",
          dialogue: null,
          os: null,
          audio: "警戒带抽打铁栏的声音。",
          transitionHint: "接上一个镜头",
          continuityNotes: "林夏仍在码头入口区域。",
          durationSec: 3,
        },
      ],
    };
    const responses = [
      {
        id: "task_2",
        projectId: "proj_1",
        type: "shot_script_generate",
        status: "pending",
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-23T00:00:00.000Z",
        startedAt: null,
        finishedAt: null,
        errorMessage: null,
        files: {
          inputPath: "tasks/task_2/input.json",
          outputPath: "tasks/task_2/output.json",
          logPath: "tasks/task_2/log.txt",
        },
      },
      {
        id: "shot_script_1",
        title: "Episode 1 Shot Script",
        sourceStoryboardId: "storyboard_1",
        sourceTaskId: "task_2",
        updatedAt: "2026-03-23T00:00:02.000Z",
        approvedAt: null,
        segmentCount: 1,
        shotCount: 2,
        totalDurationSec: 6,
        segments: [baseSegment],
      },
      {
        projectId: "proj_1",
        projectName: "Test Project",
        projectStatus: "shot_script_in_review",
        currentShotScript: {
          id: "shot_script_1",
          title: "Episode 1 Shot Script",
          sourceStoryboardId: "storyboard_1",
          sourceTaskId: "task_2",
          updatedAt: "2026-03-23T00:00:02.000Z",
          approvedAt: null,
          segmentCount: 1,
          shotCount: 2,
          totalDurationSec: 6,
          segments: [baseSegment],
        },
        latestReview: null,
        latestTask: null,
        availableActions: {
          saveSegment: true,
          regenerateSegment: true,
          approveSegment: true,
          approveAll: true,
        },
      },
      {
        id: "shot_script_1",
        title: "Episode 1 Shot Script Revised",
        sourceStoryboardId: "storyboard_1",
        sourceTaskId: "task_2",
        updatedAt: "2026-03-23T00:00:03.000Z",
        approvedAt: null,
        segmentCount: 1,
        shotCount: 2,
        totalDurationSec: 6,
        segments: [
          {
            ...baseSegment,
            name: "雨夜码头加强版",
            shots: baseSegment.shots.map((shot, index) =>
              index === 1 ? { ...shot, transitionHint: "推近到警戒带" } : shot,
            ),
          },
        ],
      },
      {
        id: "shot_script_1",
        title: "Episode 1 Shot Script Revised",
        sourceStoryboardId: "storyboard_1",
        sourceTaskId: "task_2",
        updatedAt: "2026-03-23T00:00:04.000Z",
        approvedAt: null,
        segmentCount: 1,
        shotCount: 2,
        totalDurationSec: 6,
        segments: [
          {
            ...baseSegment,
            status: "approved" as const,
            approvedAt: "2026-03-23T00:00:04.000Z",
          },
        ],
      },
      {
        id: "shot_script_1",
        title: "Episode 1 Shot Script Revised",
        sourceStoryboardId: "storyboard_1",
        sourceTaskId: "task_2",
        updatedAt: "2026-03-23T00:00:05.000Z",
        approvedAt: "2026-03-23T00:00:05.000Z",
        segmentCount: 1,
        shotCount: 2,
        totalDurationSec: 6,
        segments: [
          {
            ...baseSegment,
            status: "approved" as const,
            approvedAt: "2026-03-23T00:00:05.000Z",
          },
        ],
      },
      {
        id: "task_3",
        projectId: "proj_1",
        type: "shot_script_segment_generate",
        status: "pending",
        createdAt: "2026-03-23T00:00:06.000Z",
        updatedAt: "2026-03-23T00:00:06.000Z",
        startedAt: null,
        finishedAt: null,
        errorMessage: null,
        files: {
          inputPath: "tasks/task_3/input.json",
          outputPath: "tasks/task_3/output.json",
          logPath: "tasks/task_3/log.txt",
        },
      },
    ];
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => responses[0] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[1] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[2] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[3] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[4] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[5] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[6] });
    global.fetch = mockFetch;

    await apiClient.createShotScriptGenerateTask("proj_1");
    await apiClient.getCurrentShotScript("proj_1");
    await apiClient.getShotScriptReviewWorkspace("proj_1");
    await apiClient.saveShotScriptSegment("proj_1", "segment_1", {
      name: "雨夜码头加强版",
      summary: "林夏在暴雨码头第一次听见异响。",
      durationSec: 6,
      shots: [
        {
          id: "shot_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 1,
          shotCode: "S01-SG01-SH01",
          purpose: "建立码头空间和危险气氛。",
          visual: "雨水顺着集装箱边缘流下，远处探照灯扫过积水。",
          subject: "林夏",
          action: "林夏撑伞快步走进码头入口。",
          dialogue: null,
          os: "今晚绝不能出错。",
          audio: "暴雨、风声、远处船笛。",
          transitionHint: "硬切入",
          continuityNotes: "黑伞保持右手持伞。",
          durationSec: 3,
        },
        {
          id: "shot_2",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 2,
          shotCode: "S01-SG01-SH02",
          purpose: "把注意力收束到异响来源。",
          visual: "镜头越过林夏肩膀，看向被风掀动的警戒带。",
          subject: "林夏与警戒带",
          action: "林夏停步回头，目光锁定响动方向。",
          dialogue: null,
          os: null,
          audio: "警戒带抽打铁栏的声音。",
          transitionHint: "推近到警戒带",
          continuityNotes: "林夏仍在码头入口区域。",
          durationSec: 3,
        },
      ],
    });
    await apiClient.approveShotScriptSegment("proj_1", "segment_1");
    await apiClient.approveAllShotScriptSegments("proj_1");
    await apiClient.regenerateShotScriptSegment("proj_1", "segment_1");

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      `${config.apiBaseUrl}/projects/proj_1/shot-script/generate`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `${config.apiBaseUrl}/projects/proj_1/shot-script/current`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      `${config.apiBaseUrl}/projects/proj_1/shot-script/review`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      4,
      `${config.apiBaseUrl}/projects/proj_1/shot-script/segments/segment_1`,
      expect.objectContaining({ method: "PUT" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      5,
      `${config.apiBaseUrl}/projects/proj_1/shot-script/segments/segment_1/approve`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      6,
      `${config.apiBaseUrl}/projects/proj_1/shot-script/approve-all`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      7,
      `${config.apiBaseUrl}/projects/proj_1/shot-script/segments/segment_1/regenerate`,
      expect.objectContaining({ method: "POST" }),
    );

    const saveHeaders = mockFetch.mock.calls[3]?.[1]?.headers as Headers;
    expect(saveHeaders.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(mockFetch.mock.calls[3]?.[1]?.body as string)).toEqual({
      name: "雨夜码头加强版",
      summary: "林夏在暴雨码头第一次听见异响。",
      durationSec: 6,
      shots: [
        {
          id: "shot_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 1,
          shotCode: "S01-SG01-SH01",
          purpose: "建立码头空间和危险气氛。",
          visual: "雨水顺着集装箱边缘流下，远处探照灯扫过积水。",
          subject: "林夏",
          action: "林夏撑伞快步走进码头入口。",
          dialogue: null,
          os: "今晚绝不能出错。",
          audio: "暴雨、风声、远处船笛。",
          transitionHint: "硬切入",
          continuityNotes: "黑伞保持右手持伞。",
          durationSec: 3,
        },
        {
          id: "shot_2",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 2,
          shotCode: "S01-SG01-SH02",
          purpose: "把注意力收束到异响来源。",
          visual: "镜头越过林夏肩膀，看向被风掀动的警戒带。",
          subject: "林夏与警戒带",
          action: "林夏停步回头，目光锁定响动方向。",
          dialogue: null,
          os: null,
          audio: "警戒带抽打铁栏的声音。",
          transitionHint: "推近到警戒带",
          continuityNotes: "林夏仍在码头入口区域。",
          durationSec: 3,
        },
      ],
    });
  });

  it("uses FormData without forcing a JSON content-type header for reference-image uploads", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "char-rin",
        projectId: "proj-1",
        batchId: "char-batch-1",
        sourceMasterPlotId: "mp-1",
        characterName: "Rin",
        promptTextGenerated: "silver pilot jacket",
        promptTextCurrent: "silver pilot jacket",
        referenceImages: [],
        imageAssetPath: null,
        imageWidth: null,
        imageHeight: null,
        provider: null,
        model: null,
        status: "in_review",
        updatedAt: "2026-03-22T12:00:00.000Z",
        approvedAt: null,
        sourceTaskId: null,
      }),
    });
    global.fetch = mockFetch;

    await apiClient.uploadCharacterReferenceImages("proj-1", "char-rin", [
      new File(["test"], "rin-face.png", { type: "image/png" }),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const headers = mockFetch.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("calls the image endpoints with the expected methods and payloads", async () => {
    const responses = [
      {
        id: "task_images_generate_1",
        projectId: "proj_1",
        type: "images_generate",
        status: "pending",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:00:00.000Z",
        startedAt: null,
        finishedAt: null,
        errorMessage: null,
        files: {
          inputPath: "tasks/task_images_generate_1/input.json",
          outputPath: "tasks/task_images_generate_1/output.json",
          logPath: "tasks/task_images_generate_1/log.txt",
        },
      },
      {
        currentBatch: {
          id: "image_batch_1",
          sourceShotScriptId: "shot_script_1",
          segmentCount: 1,
          totalFrameCount: 2,
          approvedFrameCount: 0,
          updatedAt: "2026-03-24T00:00:01.000Z",
        },
        frames: [
          {
            id: "frame_start_1",
            batchId: "image_batch_1",
            projectId: "proj_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            frameType: "start_frame",
            planStatus: "planned",
            imageStatus: "in_review",
            selectedCharacterIds: ["char_rin_1"],
            matchedReferenceImagePaths: ["character-sheets/char_rin/current.png"],
            unmatchedCharacterIds: [],
            promptTextSeed: "雨夜市场入口，林站在霓虹雨幕前。",
            promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前。",
            negativePromptTextCurrent: null,
            promptUpdatedAt: "2026-03-24T00:00:01.000Z",
            imageAssetPath: "images/frame_start_1/current.png",
            imageWidth: 1536,
            imageHeight: 1024,
            provider: "turnaround-image",
            model: "doubao-seedream-5-0-260128",
            approvedAt: null,
            updatedAt: "2026-03-24T00:00:01.000Z",
            sourceTaskId: "task_frame_start_1",
          },
        ],
      },
      {
        id: "frame_start_1",
        batchId: "image_batch_1",
        projectId: "proj_1",
        sourceShotScriptId: "shot_script_1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        frameType: "start_frame",
        planStatus: "planned",
        imageStatus: "in_review",
        selectedCharacterIds: ["char_rin_1"],
        matchedReferenceImagePaths: ["character-sheets/char_rin/current.png"],
        unmatchedCharacterIds: [],
        promptTextSeed: "雨夜市场入口，林站在霓虹雨幕前。",
        promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前。",
        negativePromptTextCurrent: null,
        promptUpdatedAt: "2026-03-24T00:00:01.000Z",
        imageAssetPath: "images/frame_start_1/current.png",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "turnaround-image",
        model: "doubao-seedream-5-0-260128",
        approvedAt: null,
        updatedAt: "2026-03-24T00:00:01.000Z",
        sourceTaskId: "task_frame_start_1",
      },
      {
        id: "frame_start_1",
        batchId: "image_batch_1",
        projectId: "proj_1",
        sourceShotScriptId: "shot_script_1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        frameType: "start_frame",
        planStatus: "planned",
        imageStatus: "in_review",
        selectedCharacterIds: ["char_rin_1"],
        matchedReferenceImagePaths: ["character-sheets/char_rin/current.png"],
        unmatchedCharacterIds: [],
        promptTextSeed: "雨夜市场入口，林站在霓虹雨幕前。",
        promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前，镜头更贴近人物表情。",
        negativePromptTextCurrent: "低清晰度",
        promptUpdatedAt: "2026-03-24T00:00:02.000Z",
        imageAssetPath: "images/frame_start_1/current.png",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "turnaround-image",
        model: "doubao-seedream-5-0-260128",
        approvedAt: null,
        updatedAt: "2026-03-24T00:00:02.000Z",
        sourceTaskId: "task_frame_start_1",
      },
      {
        id: "task_frame_prompt_1",
        projectId: "proj_1",
        type: "frame_prompt_generate",
        status: "pending",
        createdAt: "2026-03-24T00:00:03.000Z",
        updatedAt: "2026-03-24T00:00:03.000Z",
        startedAt: null,
        finishedAt: null,
        errorMessage: null,
        files: {
          inputPath: "tasks/task_frame_prompt_1/input.json",
          outputPath: "tasks/task_frame_prompt_1/output.json",
          logPath: "tasks/task_frame_prompt_1/log.txt",
        },
      },
      {
        id: "task_frame_image_1",
        projectId: "proj_1",
        type: "frame_image_generate",
        status: "pending",
        createdAt: "2026-03-24T00:00:04.000Z",
        updatedAt: "2026-03-24T00:00:04.000Z",
        startedAt: null,
        finishedAt: null,
        errorMessage: null,
        files: {
          inputPath: "tasks/task_frame_image_1/input.json",
          outputPath: "tasks/task_frame_image_1/output.json",
          logPath: "tasks/task_frame_image_1/log.txt",
        },
      },
      {
        id: "frame_start_1",
        batchId: "image_batch_1",
        projectId: "proj_1",
        sourceShotScriptId: "shot_script_1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        frameType: "start_frame",
        planStatus: "planned",
        imageStatus: "approved",
        selectedCharacterIds: ["char_rin_1"],
        matchedReferenceImagePaths: ["character-sheets/char_rin/current.png"],
        unmatchedCharacterIds: [],
        promptTextSeed: "雨夜市场入口，林站在霓虹雨幕前。",
        promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前，镜头更贴近人物表情。",
        negativePromptTextCurrent: "低清晰度",
        promptUpdatedAt: "2026-03-24T00:00:02.000Z",
        imageAssetPath: "images/frame_start_1/current.png",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "turnaround-image",
        model: "doubao-seedream-5-0-260128",
        approvedAt: "2026-03-24T00:00:05.000Z",
        updatedAt: "2026-03-24T00:00:05.000Z",
        sourceTaskId: "task_frame_start_1",
      },
      {
        currentBatch: {
          id: "image_batch_1",
          sourceShotScriptId: "shot_script_1",
          segmentCount: 1,
          totalFrameCount: 2,
          approvedFrameCount: 2,
          updatedAt: "2026-03-24T00:00:06.000Z",
        },
        frames: [
          {
            id: "frame_start_1",
            batchId: "image_batch_1",
            projectId: "proj_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            frameType: "start_frame",
            planStatus: "planned",
            imageStatus: "approved",
            selectedCharacterIds: ["char_rin_1"],
            matchedReferenceImagePaths: ["character-sheets/char_rin/current.png"],
            unmatchedCharacterIds: [],
            promptTextSeed: "雨夜市场入口，林站在霓虹雨幕前。",
            promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前，镜头更贴近人物表情。",
            negativePromptTextCurrent: "低清晰度",
            promptUpdatedAt: "2026-03-24T00:00:02.000Z",
            imageAssetPath: "images/frame_start_1/current.png",
            imageWidth: 1536,
            imageHeight: 1024,
            provider: "turnaround-image",
            model: "doubao-seedream-5-0-260128",
            approvedAt: "2026-03-24T00:00:05.000Z",
            updatedAt: "2026-03-24T00:00:05.000Z",
            sourceTaskId: "task_frame_start_1",
          },
          {
            id: "frame_end_1",
            batchId: "image_batch_1",
            projectId: "proj_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            frameType: "end_frame",
            planStatus: "planned",
            imageStatus: "approved",
            selectedCharacterIds: ["char_rin_1"],
            matchedReferenceImagePaths: ["character-sheets/char_rin/current.png"],
            unmatchedCharacterIds: [],
            promptTextSeed: "尾帧定格在林与天际冷白尾光的对视。",
            promptTextCurrent: "尾帧定格在林与天际冷白尾光的对视。",
            negativePromptTextCurrent: null,
            promptUpdatedAt: "2026-03-24T00:00:02.000Z",
            imageAssetPath: "images/frame_end_1/current.png",
            imageWidth: 1536,
            imageHeight: 1024,
            provider: "turnaround-image",
            model: "doubao-seedream-5-0-260128",
            approvedAt: "2026-03-24T00:00:06.000Z",
            updatedAt: "2026-03-24T00:00:06.000Z",
            sourceTaskId: "task_frame_end_1",
          },
        ],
      },
      {
        batchId: "image_batch_1",
        frameCount: 2,
        taskIds: ["task_frame_prompt_1", "task_frame_prompt_2"],
      },
    ];
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => responses[0] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[1] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[2] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[3] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[4] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[5] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[6] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[7] })
      .mockResolvedValueOnce({ ok: true, json: async () => responses[8] });
    global.fetch = mockFetch;

    await apiClient.createImagesGenerateTask("proj_1");
    await apiClient.listImages("proj_1");
    await apiClient.getImageFrame("proj_1", "frame_start_1");
    await apiClient.updateImageFramePrompt("proj_1", "frame_start_1", {
      promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前，镜头更贴近人物表情。",
      negativePromptTextCurrent: "低清晰度",
    });
    await apiClient.regenerateImageFramePrompt("proj_1", "frame_start_1");
    await apiClient.generateImageFrame("proj_1", "frame_start_1");
    await apiClient.approveImageFrame("proj_1", "frame_start_1");
    await apiClient.approveAllImageFrames("proj_1");
    await apiClient.regenerateAllImagePrompts("proj_1");

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      `${config.apiBaseUrl}/projects/proj_1/images/generate`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `${config.apiBaseUrl}/projects/proj_1/images`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      `${config.apiBaseUrl}/projects/proj_1/images/frames/frame_start_1`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      4,
      `${config.apiBaseUrl}/projects/proj_1/images/frames/frame_start_1/prompt`,
      expect.objectContaining({ method: "PUT" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      5,
      `${config.apiBaseUrl}/projects/proj_1/images/frames/frame_start_1/regenerate-prompt`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      6,
      `${config.apiBaseUrl}/projects/proj_1/images/frames/frame_start_1/generate`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      7,
      `${config.apiBaseUrl}/projects/proj_1/images/frames/frame_start_1/approve`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      8,
      `${config.apiBaseUrl}/projects/proj_1/images/approve-all`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      9,
      `${config.apiBaseUrl}/projects/proj_1/images/regenerate-prompts`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("accepts pending image frames with empty prompts while frame prompt generation is still running", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        currentBatch: {
          id: "image_batch_1",
          sourceShotScriptId: "shot_script_1",
          segmentCount: 1,
          totalFrameCount: 2,
          approvedFrameCount: 0,
          updatedAt: "2026-03-24T00:00:01.000Z",
        },
        frames: [
          {
            id: "frame_start_1",
            batchId: "image_batch_1",
            projectId: "proj_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            frameType: "start_frame",
            planStatus: "pending",
            imageStatus: "pending",
            selectedCharacterIds: [],
            matchedReferenceImagePaths: [],
            unmatchedCharacterIds: [],
            promptTextSeed: "",
            promptTextCurrent: "",
            negativePromptTextCurrent: null,
            promptUpdatedAt: null,
            imageAssetPath: null,
            imageWidth: null,
            imageHeight: null,
            provider: null,
            model: null,
            approvedAt: null,
            updatedAt: "2026-03-24T00:00:01.000Z",
            sourceTaskId: "task_frame_prompt_1",
          },
        ],
      }),
    });

    const response = await apiClient.listImages("proj_1");

    expect(response.frames[0]?.planStatus).toBe("pending");
    expect(response.frames[0]?.promptTextSeed).toBe("");
    expect(response.frames[0]?.promptTextCurrent).toBe("");
  });

});
