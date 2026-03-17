import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

describe("api workspace bootstrap", () => {
  it("creates the Fastify app", () => {
    expect(buildApp).toBeTypeOf("function");
  });
});
