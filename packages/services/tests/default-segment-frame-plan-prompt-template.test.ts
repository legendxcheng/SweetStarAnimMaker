import fs from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("default segment frame plan prompt template", () => {
  it("keeps the repository-level frame planning prompt aligned with SeaDream segment frames", async () => {
    const templatePath = new URL(
      "../../../prompt-templates/segment_frame.plan.generate.txt",
      import.meta.url,
    );
    const template = await fs.readFile(templatePath, "utf8");

    expect(template).toContain("SeaDream");
    expect(template).toContain("输出语言必须是简体中文");
    expect(template).toContain("start_frame");
    expect(template).toContain("end_frame");
    expect(template).toContain("selectedCharacterIds");
    expect(template).toContain("promptText");
    expect(template).toContain("negativePromptText");
    expect(template).toContain("{{frameType}}");
    expect(template).toContain("{{segment.summary}}");
    expect(template).toContain("{{approvedCharacterRosterJson}}");
  });
});
