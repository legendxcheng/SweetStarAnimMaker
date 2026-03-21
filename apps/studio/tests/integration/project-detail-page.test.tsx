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
  status: "premise_ready" as const,
  storageDir: "/path/to/project",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  premise: {
    path: "premise/v1.md",
    bytes: 42,
    updatedAt: "2024-01-01T00:00:00Z",
  },
  currentMasterPlot: null,
};

const runningTask = {
  id: "task-1",
  projectId: "proj-1",
  type: "master_plot_generate" as const,
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
  status: "master_plot_in_review" as const,
  currentMasterPlot: {
    id: "mp-1",
    title: "The Last Sky Choir",
    logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
    synopsis: "Rin follows the comet song and discovers how to lift the drowned city.",
    mainCharacters: ["Rin", "Ivo"],
    coreConflict: "Rin must choose between escape and saving the city.",
    emotionalArc: "She moves from bitterness to sacrificial hope.",
    endingBeat: "The city rises on a final chorus of light.",
    targetDurationSec: 480,
    sourceTaskId: "task-1",
    updatedAt: "2024-01-01T00:00:03Z",
    approvedAt: null,
  },
};

const generatingProject = {
  ...baseProject,
  status: "master_plot_generating" as const,
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

  it("shows the phase navigation with premise selected by default", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "前提" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    expect(screen.getByRole("button", { name: "主情节" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "分镜" })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "前提工作区" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /生成主情节/i })).not.toBeInTheDocument();
  });

  it("switches to the master-plot panel when the user clicks 主情节", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "主情节" }));

    expect(screen.getByRole("heading", { name: "主情节工作区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /生成主情节/i })).toBeInTheDocument();
    expect(screen.queryByText("项目 ID")).not.toBeInTheDocument();
  });

  it("keeps future phases disabled and ignores clicks on them", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));

    expect(screen.getByRole("heading", { name: "前提工作区" })).toBeInTheDocument();
  });

  it("loads project detail and lets the user start master-plot generation", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);
    vi.spyOn(apiModule.apiClient, "createMasterPlotGenerateTask").mockResolvedValue(
      runningTask,
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "主情节" }));
    fireEvent.click(screen.getByRole("button", { name: /生成主情节/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.createMasterPlotGenerateTask).toHaveBeenCalledWith(
        "proj-1",
      );
    });

    expect(screen.getByRole("heading", { name: "任务状态" })).toBeInTheDocument();
    expect(screen.getByText("执行中")).toBeInTheDocument();
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
      expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "主情节" }));
    expect(screen.getByText(/主情节生成中/)).toBeInTheDocument();
    expect(refreshTimer).toBeDefined();

    await act(async () => {
      refreshTimer?.();
      await flushMicrotasks();
    });

    expect(screen.getByRole("link", { name: /进入主情节审核/i })).toBeInTheDocument();
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
    vi.spyOn(apiModule.apiClient, "createMasterPlotGenerateTask").mockResolvedValue(
      runningTask,
    );
    const getTaskDetail = vi
      .spyOn(apiModule.apiClient, "getTaskDetail")
      .mockResolvedValueOnce(runningTask)
      .mockResolvedValueOnce(succeededTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "主情节" }));
    fireEvent.click(screen.getByRole("button", { name: /生成主情节/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.createMasterPlotGenerateTask).toHaveBeenCalledWith(
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

    expect(screen.getByRole("link", { name: /进入主情节审核/i })).toBeInTheDocument();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("renders task failures from the polling response", async () => {
    let pollTimer: (() => void) | undefined;
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      pollTimer = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);

    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);
    vi.spyOn(apiModule.apiClient, "createMasterPlotGenerateTask").mockResolvedValue(
      runningTask,
    );
    const getTaskDetail = vi
      .spyOn(apiModule.apiClient, "getTaskDetail")
      .mockResolvedValue(failedTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "主情节" }));
    fireEvent.click(screen.getByRole("button", { name: /生成主情节/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.createMasterPlotGenerateTask).toHaveBeenCalledWith(
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
