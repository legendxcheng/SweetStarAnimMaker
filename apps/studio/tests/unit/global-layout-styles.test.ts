import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("global layout styles", () => {
  it("keeps scrolling inside the app shell instead of the outer document", () => {
    const globalCss = readFileSync(
      resolve(__dirname, "../../src/styles/global.css"),
      "utf8",
    );

    expect(globalCss).toContain("html,");
    expect(globalCss).toContain("body,");
    expect(globalCss).toContain("#root");
    expect(globalCss).toContain("height: 100%;");
    expect(globalCss).toContain("overflow: hidden;");
  });
});
