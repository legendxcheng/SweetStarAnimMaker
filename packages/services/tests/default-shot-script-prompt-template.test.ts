import fs from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("default shot script prompt template", () => {
  it("keeps the repository-level shot script prompt segment-first and Chinese", async () => {
    const templatePath = new URL(
      "../../../prompt-templates/shot_script.segment.generate.txt",
      import.meta.url,
    );
    const template = await fs.readFile(templatePath, "utf8");

    expect(template).toContain("输出语言必须是简体中文");
    expect(template).toContain("一个 segment 可以拆成多个 shots");
    expect(template).toContain("shotCode");
    expect(template).toContain("不要输出 imagePrompt、negativePrompt、motionHint 等出图字段");
    expect(template).toContain("{{storyboardTitle}}");
    expect(template).toContain("{{segment.visual}}");
    expect(template).toContain("已批准角色设定");
    expect(template).toContain("{{characterSheets}}");
    expect(template).toContain("必须使用角色设定中的标准角色名");
    expect(template).toContain("禁止使用未登记简称");
  });
});
