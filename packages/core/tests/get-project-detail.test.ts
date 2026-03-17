import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  createGetProjectDetailUseCase,
} from "../src/index";

describe("get project detail use case", () => {
  it("returns the expected detail dto", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn().mockReturnValue({
        id: "proj_20260317_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260317_ab12cd-my-story",
        scriptRelPath: "script/original.txt",
        scriptBytes: 7,
        status: "script_ready",
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z",
        scriptUpdatedAt: "2026-03-17T00:00:00.000Z",
      }),
      updateScriptMetadata: vi.fn(),
    };
    const useCase = createGetProjectDetailUseCase({ repository });

    const result = await useCase.execute({
      projectId: "proj_20260317_ab12cd",
    });

    expect(result.script.bytes).toBe(7);
    expect(result.script.path).toBe("script/original.txt");
  });

  it("throws when the project does not exist", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn().mockReturnValue(null),
      updateScriptMetadata: vi.fn(),
    };
    const useCase = createGetProjectDetailUseCase({ repository });

    await expect(
      useCase.execute({
        projectId: "missing-project",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
