import fs from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("default master plot prompt template", () => {
  it("keeps the repository-level master plot prompt in Chinese with single-episode constraints", async () => {
    const templatePath = new URL(
      "../../../prompt-templates/master_plot.generate.txt",
      import.meta.url,
    );
    const template = await fs.readFile(templatePath, "utf8");

    expect(template).toContain("你是一名擅长 AI 漫剧短剧开发的编剧策划");
    expect(template).toContain("围绕一个主冲突推进");
    expect(template).toContain("只写能被镜头直接呈现的内容");
    expect(template).toContain("结尾必须留下强钩子");
    expect(template).toContain("{{premiseText}}");
  });
});
