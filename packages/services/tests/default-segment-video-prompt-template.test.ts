import fs from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("default segment video prompt template", () => {
  it("references approved frame paths and segment motion continuity guidance", async () => {
    const templatePath = new URL(
      "../../../prompt-templates/segment_video.generate.txt",
      import.meta.url,
    );
    const template = await fs.readFile(templatePath, "utf8");

    expect(template).toContain("start_frame");
    expect(template).toContain("end_frame");
    expect(template).toContain("镜头");
    expect(template).toContain("角色");
    expect(template).toContain("连续性");
    expect(template).toContain("{{start_frame_path}}");
    expect(template).toContain("{{end_frame_path}}");
    expect(template).toContain("{{segment_summary}}");
    expect(template).toContain("{{shots_summary}}");
  });
});
