import { describe, expect, it } from "vitest";
import {
  createProjectRequestSchema,
  updateProjectScriptRequestSchema,
} from "../src/index";

describe("project api schema", () => {
  it("accepts a valid create-project payload", () => {
    const parsed = createProjectRequestSchema.parse({
      name: "My Story",
      script: "Scene 1",
    });

    expect(parsed.name).toBe("My Story");
    expect(parsed.script).toBe("Scene 1");
  });

  it("accepts a valid update-project-script payload", () => {
    const parsed = updateProjectScriptRequestSchema.parse({
      script: "Updated Scene 1",
    });

    expect(parsed.script).toBe("Updated Scene 1");
  });
});
