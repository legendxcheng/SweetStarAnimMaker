import fs from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("default character sheet prompt templates", () => {
  it("keeps the repository-level character prompt template in Chinese with single-episode character-sheet guidance", async () => {
    const templatePath = new URL(
      "../../../prompt-templates/character_sheet.prompt.generate.txt",
      import.meta.url,
    );
    const template = await fs.readFile(templatePath, "utf8");

    expect(template).toContain("你是一名擅长 AI 漫剧项目开发的人物设定编剧");
    expect(template).toContain("只输出本集真正需要出镜或被重点提及的人物");
    expect(template).toContain("外观描述必须具体、稳定、可识别");
    expect(template).toContain("{{characterName}}");
    expect(template).toContain("{{masterPlot.logline}}");
    expect(template).toContain("{{masterPlot.synopsis}}");
  });

  it("keeps the repository-level turnaround prompt template focused on a single combined turnaround sheet", async () => {
    const templatePath = new URL(
      "../../../prompt-templates/character_sheet.turnaround.generate.txt",
      import.meta.url,
    );
    const template = await fs.readFile(templatePath, "utf8");

    expect(template).toContain("角色三视图");
    expect(template).toContain("同一角色");
    expect(template).toContain("正面、侧面、背面");
    expect(template).toContain("{{characterName}}");
    expect(template).toContain("{{promptTextCurrent}}");
  });
});
