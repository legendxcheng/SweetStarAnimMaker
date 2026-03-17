import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  createUpdateProjectScriptUseCase,
} from "../src/index";

describe("update project script use case", () => {
  it("rewrites script metadata and timestamps", async () => {
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
    const scriptStorage = {
      writeOriginalScript: vi.fn().mockReturnValue({
        scriptRelPath: "script/original.txt",
        scriptBytes: 15,
      }),
      readOriginalScript: vi.fn().mockReturnValue("Scene 1"),
      deleteOriginalScript: vi.fn(),
    };
    const useCase = createUpdateProjectScriptUseCase({
      repository,
      scriptStorage,
      clock: {
        now: () => "2026-03-17T01:00:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260317_ab12cd",
      script: "Updated Scene 1",
    });

    expect(repository.updateScriptMetadata).toHaveBeenCalledWith({
      id: "proj_20260317_ab12cd",
      scriptBytes: 15,
      updatedAt: "2026-03-17T01:00:00.000Z",
      scriptUpdatedAt: "2026-03-17T01:00:00.000Z",
    });
    expect(result.updatedAt).toBe("2026-03-17T01:00:00.000Z");
    expect(result.script.updatedAt).toBe("2026-03-17T01:00:00.000Z");
    expect(result.script.bytes).toBe(15);
  });

  it("restores the previous script when metadata persistence fails", async () => {
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
      updateScriptMetadata: vi.fn(() => {
        throw new Error("update failed");
      }),
    };
    const scriptStorage = {
      writeOriginalScript: vi
        .fn()
        .mockReturnValueOnce({
          scriptRelPath: "script/original.txt",
          scriptBytes: 15,
        })
        .mockReturnValueOnce({
          scriptRelPath: "script/original.txt",
          scriptBytes: 7,
        }),
      readOriginalScript: vi.fn().mockReturnValue("Scene 1"),
      deleteOriginalScript: vi.fn(),
    };
    const useCase = createUpdateProjectScriptUseCase({
      repository,
      scriptStorage,
      clock: {
        now: () => "2026-03-17T01:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260317_ab12cd",
        script: "Updated Scene 1",
      }),
    ).rejects.toThrow("update failed");

    expect(scriptStorage.writeOriginalScript).toHaveBeenNthCalledWith(2, {
      storageDir: "projects/proj_20260317_ab12cd-my-story",
      script: "Scene 1",
    });
  });

  it("throws when the project does not exist", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn().mockReturnValue(null),
      updateScriptMetadata: vi.fn(),
    };
    const scriptStorage = {
      writeOriginalScript: vi.fn(),
      readOriginalScript: vi.fn(),
      deleteOriginalScript: vi.fn(),
    };
    const useCase = createUpdateProjectScriptUseCase({
      repository,
      scriptStorage,
      clock: {
        now: () => "2026-03-17T01:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "missing-project",
        script: "Updated Scene 1",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
