import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("default scene sheet prompt template", () => {
  it("keeps the template focused on the editable scene description only", async () => {
    const templatePath = path.resolve(
      __dirname,
      "../../../prompt-templates/scene_sheet.generate.txt",
    );

    const template = await fs.readFile(templatePath, "utf8");

    expect(template.trim()).toBe("{{promptTextCurrent}}");
  });
});
