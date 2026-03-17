import { describe, expect, it } from "vitest";
import { createProjectRecord } from "../src/index";

describe("project domain", () => {
  it("creates a storage directory name from project id and slug", () => {
    const project = createProjectRecord({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z",
      scriptUpdatedAt: "2026-03-17T00:00:00.000Z",
    });

    expect(project.storageDir).toBe("projects/proj_20260317_ab12cd-my-story");
    expect(project.scriptRelPath).toBe("script/original.txt");
    expect(project.status).toBe("script_ready");
  });
});
