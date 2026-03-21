import path from "node:path";

import { describe, expect, it } from "vitest";

import { createLocalDataPaths } from "../src/index";

describe("local data paths", () => {
  it("resolves the sqlite db path under .local-data", () => {
    const paths = createLocalDataPaths("E:/repo");

    expect(paths.sqliteDbPath).toBe(path.join("E:/repo", ".local-data", "sqlite", "app.db"));
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

  it("builds the task artifact paths inside the owning project", () => {
    const paths = createLocalDataPaths("C:/repo");

    expect(
      paths.projectTaskInputPath(
        "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_storyboard",
      ),
    ).toMatch(/tasks[\\/]+task_20260321_storyboard[\\/]+input\.json$/);
    expect(
      paths.projectTaskOutputPath(
        "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_storyboard",
      ),
    ).toMatch(/tasks[\\/]+task_20260321_storyboard[\\/]+output\.json$/);
    expect(
      paths.projectTaskLogPath(
        "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_storyboard",
      ),
    ).toMatch(/tasks[\\/]+task_20260321_storyboard[\\/]+log\.txt$/);
  });

  it("resolves the global prompt template path at the repo root", () => {
    const paths = createLocalDataPaths("E:/repo");

    expect(paths.globalPromptTemplatesDir).toBe(path.join("E:/repo", "prompt-templates"));
    expect(paths.globalPromptTemplatePath("storyboard.generate")).toBe(
      path.join("E:/repo", "prompt-templates", "storyboard.generate.txt"),
    );
  });

  it("builds the current storyboard artifact paths inside the project", () => {
    const paths = createLocalDataPaths("C:/repo");

    expect(
      paths.projectStoryboardCurrentJsonPath("projects/proj_20260321_ab12cd-my-story"),
    ).toMatch(/storyboard[\\/]+current\.json$/);
    expect(
      paths.projectStoryboardCurrentMarkdownPath("projects/proj_20260321_ab12cd-my-story"),
    ).toMatch(/storyboard[\\/]+current\.md$/);
  });
});
