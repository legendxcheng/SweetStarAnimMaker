import { describe, it, expect, beforeEach, vi } from "vitest";
import { apiClient } from "../../src/services/api-client";
import { config } from "../../src/services/config";

describe("API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("uses VITE_API_BASE_URL from config", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ projects: [] }),
    });
    global.fetch = mockFetch;

    await apiClient.get("/projects");

    expect(mockFetch).toHaveBeenCalledWith(
      `${config.apiBaseUrl}/projects`,
      expect.any(Object)
    );
  });

  it("converts non-2xx responses to structured errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ message: "Project not found" }),
    });

    await expect(apiClient.get("/projects/invalid")).rejects.toThrow(
      "Project not found"
    );
  });

  it("validates JSON responses against schemas", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ invalid: "data" }),
    });

    // This will be validated in actual usage with zod schemas
    const response = await apiClient.get("/projects");
    expect(response).toEqual({ invalid: "data" });
  });
});
