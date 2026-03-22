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
