import fs from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("default segment video prompt template", () => {
  it("describes a shot clip without hard-coding segment-first wording or embedding frame paths", async () => {
    const templatePath = new URL(
      "../../../prompt-templates/segment_video.generate.txt",
      import.meta.url,
    );
    const template = await fs.readFile(templatePath, "utf8");

    expect(template).toContain("start_frame");
    expect(template).toContain("frameDependency");
    expect(template).toContain("镜头");
    expect(template).toContain("角色");
    expect(template).toContain("连续性");
    expect(template).toContain("{{segment_summary}}");
    expect(template).toContain("{{shot_summary}}");
    expect(template).toContain("durationSec");
    expect(template).not.toContain("{{start_frame_path}}");
    expect(template).not.toContain("{{end_frame_path}}");
    expect(template).not.toContain("多镜头 segment 视频片段");
  });
});
