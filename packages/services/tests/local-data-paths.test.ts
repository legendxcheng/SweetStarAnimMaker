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

  it("resolves the premise path under the project storage directory", () => {
    const paths = createLocalDataPaths("E:/repo");

    expect(paths.projectPremisePath("projects/proj_20260317_ab12cd-my-story")).toBe(
      path.join(
        "E:/repo",
        ".local-data",
        "projects",
        "proj_20260317_ab12cd-my-story",
        "premise",
        "v1.md",
      ),
    );
  });

  it("builds the task input path inside the owning project", () => {
    const paths = createLocalDataPaths("C:/repo");

    expect(
      paths.projectTaskInputPath(
        "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
      ),
    ).toMatch(/tasks[\\/]+task_20260317_ab12cd[\\/]+input\.json$/);
    expect(
      paths.projectTaskOutputPath(
        "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
      ),
    ).toMatch(/tasks[\\/]+task_20260317_ab12cd[\\/]+output\.json$/);
    expect(
      paths.projectTaskLogPath(
        "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
      ),
    ).toMatch(/tasks[\\/]+task_20260317_ab12cd[\\/]+log\.txt$/);
  });

  it("builds the current storyboard version path inside the project", () => {
    const paths = createLocalDataPaths("C:/repo");

    expect(
      paths.projectStoryboardVersionPath(
        "projects/proj_20260317_ab12cd-my-story",
        "storyboards/versions/v1-ai.json",
      ),
    ).toMatch(/storyboards[\\/]+versions[\\/]+v1-ai\.json$/);
    expect(
      paths.projectStoryboardRawResponsePath(
        "projects/proj_20260317_ab12cd-my-story",
        "storyboards/raw/task_20260317_ab12cd-gemini-response.json",
      ),
    ).toMatch(/storyboards[\\/]+raw[\\/]+task_20260317_ab12cd-gemini-response\.json$/);
  });
});
