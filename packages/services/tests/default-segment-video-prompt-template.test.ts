import fs from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("default segment video prompt template", () => {
  it("describes a multi-shot segment without embedding frame paths", async () => {
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
    expect(template).toContain("{{segment_summary}}");
    expect(template).toContain("{{shots_summary}}");
    expect(template).toContain("多镜头");
    expect(template).not.toContain("{{start_frame_path}}");
    expect(template).not.toContain("{{end_frame_path}}");
    expect(template).not.toContain("从 start_frame 过渡到 end_frame");
  });
});
