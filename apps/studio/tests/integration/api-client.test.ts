import { describe, it, expect, beforeEach, vi } from "vitest";
import { apiClient, ApiError } from "../../src/services/api-client";
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
});
