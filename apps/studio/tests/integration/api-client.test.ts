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
        shots: [
          {
            id: "shot_1",
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 1,
            shotCode: "S01-SG01",
            shotPurpose: "Establish the flooded market.",
            subjectCharacters: ["Rin"],
            environment: "Flooded dawn market",
            framing: "medium wide shot",
            cameraAngle: "eye level",
            composition: "Rin framed by lanterns",
            actionMoment: "Rin pauses at the waterline",
            emotionTone: "uneasy anticipation",
            continuityNotes: "Keep soaked satchel on left shoulder",
            imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
            negativePrompt: null,
            motionHint: null,
            durationSec: 4,
          },
        ],
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
          shots: [
            {
              id: "shot_1",
              sceneId: "scene_1",
              segmentId: "segment_1",
              order: 1,
              shotCode: "S01-SG01",
              shotPurpose: "Establish the flooded market.",
              subjectCharacters: ["Rin"],
              environment: "Flooded dawn market",
              framing: "medium wide shot",
              cameraAngle: "eye level",
              composition: "Rin framed by lanterns",
              actionMoment: "Rin pauses at the waterline",
              emotionTone: "uneasy anticipation",
              continuityNotes: "Keep soaked satchel on left shoulder",
              imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
              negativePrompt: null,
              motionHint: null,
              durationSec: 4,
            },
          ],
        },
        latestReview: null,
        latestTask: null,
        availableActions: {
          save: true,
          approve: true,
          reject: true,
        },
      },
      {
        id: "shot_script_1",
        title: "Episode 1 Shot Script Revised",
        sourceStoryboardId: "storyboard_1",
        sourceTaskId: "task_2",
        updatedAt: "2026-03-23T00:00:03.000Z",
        approvedAt: null,
        shots: [
          {
            id: "shot_1",
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 1,
            shotCode: "S01-SG01",
            shotPurpose: "Establish the flooded market.",
            subjectCharacters: ["Rin"],
            environment: "Flooded dawn market",
            framing: "medium wide shot",
            cameraAngle: "eye level",
            composition: "Rin framed by lanterns",
            actionMoment: "Rin pauses at the waterline",
            emotionTone: "uneasy anticipation",
            continuityNotes: "Keep soaked satchel on left shoulder",
            imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
            negativePrompt: null,
            motionHint: "slow push-in",
            durationSec: 4,
          },
        ],
      },
      {
        id: "shot_script_1",
        title: "Episode 1 Shot Script Revised",
        sourceStoryboardId: "storyboard_1",
        sourceTaskId: "task_2",
        updatedAt: "2026-03-23T00:00:04.000Z",
        approvedAt: "2026-03-23T00:00:04.000Z",
        shots: [
          {
            id: "shot_1",
            sceneId: "scene_1",
            segmentId: "segment_1",
            order: 1,
            shotCode: "S01-SG01",
            shotPurpose: "Establish the flooded market.",
            subjectCharacters: ["Rin"],
            environment: "Flooded dawn market",
            framing: "medium wide shot",
            cameraAngle: "eye level",
            composition: "Rin framed by lanterns",
            actionMoment: "Rin pauses at the waterline",
            emotionTone: "uneasy anticipation",
            continuityNotes: "Keep soaked satchel on left shoulder",
            imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
            negativePrompt: null,
            motionHint: "slow push-in",
            durationSec: 4,
          },
        ],
      },
      {
        id: "task_3",
        projectId: "proj_1",
        type: "shot_script_generate",
        status: "pending",
        createdAt: "2026-03-23T00:00:05.000Z",
        updatedAt: "2026-03-23T00:00:05.000Z",
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
      .mockResolvedValueOnce({ ok: true, json: async () => responses[5] });
    global.fetch = mockFetch;

    await apiClient.createShotScriptGenerateTask("proj_1");
    await apiClient.getCurrentShotScript("proj_1");
    await apiClient.getShotScriptReviewWorkspace("proj_1");
    await apiClient.saveShotScript("proj_1", {
      title: "Episode 1 Shot Script Revised",
      sourceStoryboardId: "storyboard_1",
      sourceTaskId: "task_2",
      shots: [
        {
          id: "shot_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 1,
          shotCode: "S01-SG01",
          shotPurpose: "Establish the flooded market.",
          subjectCharacters: ["Rin"],
          environment: "Flooded dawn market",
          framing: "medium wide shot",
          cameraAngle: "eye level",
          composition: "Rin framed by lanterns",
          actionMoment: "Rin pauses at the waterline",
          emotionTone: "uneasy anticipation",
          continuityNotes: "Keep soaked satchel on left shoulder",
          imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
          negativePrompt: null,
          motionHint: "slow push-in",
          durationSec: 4,
        },
      ],
    });
    await apiClient.approveShotScript("proj_1");
    await apiClient.rejectShotScript("proj_1", {
      reason: "Need more coverage on the reveal.",
      nextAction: "regenerate",
    });

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      `${config.apiBaseUrl}/projects/proj_1/tasks/shot-script-generate`,
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
      `${config.apiBaseUrl}/projects/proj_1/shot-script`,
      expect.objectContaining({ method: "PUT" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      5,
      `${config.apiBaseUrl}/projects/proj_1/shot-script/approve`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      6,
      `${config.apiBaseUrl}/projects/proj_1/shot-script/reject`,
      expect.objectContaining({ method: "POST" }),
    );

    const saveHeaders = mockFetch.mock.calls[3]?.[1]?.headers as Headers;
    expect(saveHeaders.get("Content-Type")).toBe("application/json");
    expect(mockFetch.mock.calls[5]?.[1]?.body).toBe(
      JSON.stringify({
        reason: "Need more coverage on the reveal.",
        nextAction: "regenerate",
      }),
    );
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
});
