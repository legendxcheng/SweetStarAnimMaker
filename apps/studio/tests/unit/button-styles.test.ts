import { describe, expect, it } from "vitest";

import { getButtonClassName } from "../../src/styles/button-styles";

describe("getButtonClassName", () => {
  it("returns the accent gradient for primary buttons", () => {
    const className = getButtonClassName({ variant: "primary" });

    expect(className).toContain("from-(--color-accent)");
    expect(className).toContain("to-(--color-accent-end)");
    expect(className).toContain("hover:opacity-90");
    expect(className).toContain("disabled:cursor-not-allowed");
  });

  it("uses solid semantic gradients instead of outline borders", () => {
    const successClassName = getButtonClassName({ variant: "success" });
    const warningClassName = getButtonClassName({ variant: "warning" });
    const dangerClassName = getButtonClassName({ variant: "danger" });

    expect(successClassName).toContain("bg-gradient-to-r");
    expect(successClassName).toContain("from-(--color-success)");
    expect(successClassName).not.toContain("border-(--color-success)/30");

    expect(warningClassName).toContain("bg-gradient-to-r");
    expect(warningClassName).toContain("from-(--color-warning)");
    expect(warningClassName).not.toContain("border-(--color-warning)/30");

    expect(dangerClassName).toContain("bg-gradient-to-r");
    expect(dangerClassName).toContain("from-(--color-danger)");
    expect(dangerClassName).not.toContain("border-(--color-danger)/30");
  });

  it("uses a filled neutral gradient for secondary buttons and supports compact spacing", () => {
    const secondaryClassName = getButtonClassName({ variant: "secondary" });
    const compactClassName = getButtonClassName({
      variant: "primary",
      size: "compact",
    });

    expect(secondaryClassName).toContain("bg-gradient-to-r");
    expect(secondaryClassName).toContain("from-(--color-bg-elevated)");
    expect(secondaryClassName).toContain("to-(--color-border)");
    expect(secondaryClassName).toContain("border-(--color-border-muted)");
    expect(secondaryClassName).toContain("text-(--color-text-primary)");
    expect(secondaryClassName).toContain("transition-opacity");

    expect(compactClassName).toContain("px-3");
    expect(compactClassName).toContain("py-1.5");
    expect(compactClassName).not.toContain("px-4 py-2");
  });
});
