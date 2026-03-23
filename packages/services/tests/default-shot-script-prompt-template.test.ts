import fs from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("default shot script prompt template", () => {
  it("keeps the repository-level shot script prompt in Chinese with one-segment-one-shot constraints", async () => {
    const templatePath = new URL(
      "../../../prompt-templates/shot_script.generate.txt",
      import.meta.url,
    );
    const template = await fs.readFile(templatePath, "utf8");

    expect(template).toContain("你是一名擅长 AI 漫剧短剧制作的镜头脚本编剧");
    expect(template).toContain("一个 storyboard segment 对应一个 shot");
    expect(template).toContain("shotCode");
    expect(template).toContain("imagePrompt");
    expect(template).toContain("{{storyboard.title}}");
    expect(template).toContain("{{storyboard.scenes.0.segments.0.visual}}");
  });
});
