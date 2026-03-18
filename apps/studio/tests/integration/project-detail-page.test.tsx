import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProjectDetailPage } from "../../src/pages/project-detail-page";
import * as apiModule from "../../src/services/api-client";

vi.mock("../../src/services/api-client");

const baseProject = {
  id: "proj-1",
  name: "Test Project",
  slug: "test-project",
  status: "script_ready" as const,
  storageDir: "/path/to/project",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  script: {
    path: "script/original.txt",
    bytes: 42,
    updatedAt: "2024-01-01T00:00:00Z",
  },
  currentStoryboard: null,
};

const runningTask = {
  id: "task-1",
  projectId: "proj-1",
  type: "storyboard_generate" as const,
  status: "running" as const,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:01Z",
  startedAt: "2024-01-01T00:00:01Z",
  finishedAt: null,
  errorMessage: null,
  files: {
    inputPath: "tasks/task-1/input.json",
    outputPath: "tasks/task-1/output.json",
    logPath: "tasks/task-1/log.txt",
  },
};

const succeededTask = {
  ...runningTask,
  status: "succeeded" as const,
  updatedAt: "2024-01-01T00:00:03Z",
  finishedAt: "2024-01-01T00:00:03Z",
};

const failedTask = {
  ...runningTask,
  status: "failed" as const,
  updatedAt: "2024-01-01T00:00:03Z",
  finishedAt: "2024-01-01T00:00:03Z",
  errorMessage: "Provider rate limit",
};

const reviewedProject = {
  ...baseProject,
  status: "storyboard_in_review" as const,
  currentStoryboard: {
    id: "sbv-1",
    projectId: "proj-1",
    versionNumber: 1,
    kind: "ai" as const,
    provider: "gemini",
    model: "gemini-3.1-pro-preview",
    filePath: "storyboards/versions/v1-ai.json",
    createdAt: "2024-01-01T00:00:03Z",
    sourceTaskId: "task-1",
  },
};

const generatingProject = {
  ...baseProject,
  status: "storyboard_generating" as const,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/projects/proj-1"]}>
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("Project Detail Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads project detail and lets the user start storyboard generation", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);
    vi.spyOn(apiModule.apiClient, "createStoryboardGenerateTask").mockResolvedValue(
      runningTask,
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /generate storyboard/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.createStoryboardGenerateTask).toHaveBeenCalledWith(
        "proj-1",
      );
    });

    expect(screen.getByText(/task status/i)).toBeInTheDocument();
    expect(screen.getByText(/running/i)).toBeInTheDocument();
  });

  it("refreshes generating projects even when no local task id is available", async () => {
    let refreshTimer: (() => void) | undefined;
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      refreshTimer = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);

    vi.spyOn(apiModule.apiClient, "getProjectDetail")
      .mockResolvedValueOnce(generatingProject)
      .mockResolvedValueOnce(reviewedProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/generation in progress/i)).toBeInTheDocument();
    });

    expect(refreshTimer).toBeDefined();

    await act(async () => {
      refreshTimer?.();
      await flushMicrotasks();
    });

    expect(screen.getByRole("link", { name: /enter review/i })).toBeInTheDocument();
  });

  it("polls task detail until success, refreshes the project, and shows the review entry", async () => {
    let pollTimer: (() => void) | undefined;
    const clearIntervalSpy = vi
      .spyOn(global, "clearInterval")
      .mockImplementation(() => undefined);
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      pollTimer = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);

    vi.spyOn(apiModule.apiClient, "getProjectDetail")
      .mockResolvedValueOnce(baseProject)
      .mockResolvedValueOnce(reviewedProject);
    vi.spyOn(apiModule.apiClient, "createStoryboardGenerateTask").mockResolvedValue(
      runningTask,
    );
    const getTaskDetail = vi
      .spyOn(apiModule.apiClient, "getTaskDetail")
      .mockResolvedValueOnce(runningTask)
      .mockResolvedValueOnce(succeededTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /generate storyboard/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /generate storyboard/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.createStoryboardGenerateTask).toHaveBeenCalledWith(
        "proj-1",
      );
    });

    expect(pollTimer).toBeDefined();

    await act(async () => {
      pollTimer?.();
      await flushMicrotasks();
    });
    expect(getTaskDetail).toHaveBeenCalledWith("task-1");

    await act(async () => {
      pollTimer?.();
      await flushMicrotasks();
    });

    expect(screen.getByRole("link", { name: /enter review/i })).toBeInTheDocument();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("renders task failures from the polling response", async () => {
    let pollTimer: (() => void) | undefined;
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      pollTimer = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);

    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);
    vi.spyOn(apiModule.apiClient, "createStoryboardGenerateTask").mockResolvedValue(
      runningTask,
    );
    const getTaskDetail = vi
      .spyOn(apiModule.apiClient, "getTaskDetail")
      .mockResolvedValue(failedTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /generate storyboard/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /generate storyboard/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.createStoryboardGenerateTask).toHaveBeenCalledWith(
        "proj-1",
      );
    });

    expect(pollTimer).toBeDefined();

    await act(async () => {
      pollTimer?.();
      await flushMicrotasks();
    });

    expect(getTaskDetail).toHaveBeenCalledWith("task-1");
    expect(screen.getByText(/provider rate limit/i)).toBeInTheDocument();
  });
});
