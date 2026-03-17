import path from "node:path";

import { describe, expect, it } from "vitest";

import { createLocalDataPaths } from "../src/index";

describe("local data paths", () => {
  it("resolves the sqlite db path under .local-data", () => {
    const paths = createLocalDataPaths("E:/repo");

    expect(paths.sqliteDbPath).toBe(
      path.join("E:/repo", ".local-data", "sqlite", "app.db"),
    );
  });

  it("resolves the original script path under the project storage directory", () => {
    const paths = createLocalDataPaths("E:/repo");

    expect(
      paths.projectOriginalScriptPath("projects/proj_20260317_ab12cd-my-story"),
    ).toBe(
      path.join(
        "E:/repo",
        ".local-data",
        "projects",
        "proj_20260317_ab12cd-my-story",
        "script",
        "original.txt",
      ),
    );
  });
});
