import fs from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("default storyboard prompt template", () => {
  it("keeps the repository-level storyboard prompt in Chinese with scene and segment constraints", async () => {
    const templatePath = new URL(
      "../../../prompt-templates/storyboard.generate.txt",
      import.meta.url,
    );
    const template = await fs.readFile(templatePath, "utf8");

    expect(template).toContain("你是一名擅长 AI 漫剧短剧制作的分镜编剧");
    expect(template).toContain("单集集纲");
    expect(template).toContain("场景");
    expect(template).toContain("段落");
    expect(template).toContain("每个段落最多 15 秒");
    expect(template).toContain("{{masterPlot.logline}}");
    expect(template).toContain("{{masterPlot.synopsis}}");
  });
});
