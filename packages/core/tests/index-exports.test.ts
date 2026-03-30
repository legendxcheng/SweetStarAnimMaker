import { describe, expect, it, assertType } from "vitest";

import { TaskNotFoundError, createCreateProjectUseCase, createProjectRecord } from "../src/index";
import { createProjectRecord as createProjectRecordFromDomain } from "../src/exports/domain";
import { TaskNotFoundError as TaskNotFoundErrorFromErrors } from "../src/exports/errors";
import { createCreateProjectUseCase as createCreateProjectUseCaseFromUseCases } from "../src/exports/use-cases";
import type { TaskQueue } from "../src/exports/ports";

describe("core public barrel exports", () => {
  it("keeps the root index exports available", () => {
    expect(createProjectRecord).toBe(createProjectRecordFromDomain);
    expect(createCreateProjectUseCase).toBe(createCreateProjectUseCaseFromUseCases);
    expect(TaskNotFoundError).toBe(TaskNotFoundErrorFromErrors);
  });

  it("exposes representative grouped barrel exports", () => {
    expect(createProjectRecordFromDomain).toBeTypeOf("function");
    expect(TaskNotFoundErrorFromErrors).toBeTypeOf("function");
    expect(createCreateProjectUseCaseFromUseCases).toBeTypeOf("function");
  });

  it("keeps port type exports available from the grouped barrel", () => {
    type QueueLike = TaskQueue;

    assertType<QueueLike | undefined>(undefined);
    expect(true).toBe(true);
  });
});
