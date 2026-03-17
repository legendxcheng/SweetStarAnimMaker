import { describe, expect, it } from "vitest";

import { startWorker } from "../src/index";

describe("worker bootstrap", () => {
  it("exports a startWorker function", () => {
    expect(startWorker).toBeTypeOf("function");
  });
});
