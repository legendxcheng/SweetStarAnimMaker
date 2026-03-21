import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  currentStoryboard: null,
};

const approvedMasterPlotProject = {
  ...baseProject,
  status: "master_plot_approved" as const,
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
    sourceTaskId: "task-master-plot",
    updatedAt: "2024-01-01T00:00:03Z",
    approvedAt: "2024-01-01T00:00:04Z",
  },
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
  ...approvedMasterPlotProject,
  status: "storyboard_in_review" as const,
  currentStoryboard: {
    id: "storyboard-1",
    title: "The Last Sky Choir",
    episodeTitle: "Episode 1",
    sourceMasterPlotId: "mp-1",
    sourceTaskId: "task-1",
    updatedAt: "2024-01-01T00:00:03Z",
    approvedAt: null,
    sceneCount: 2,
    segmentCount: 5,
    totalDurationSec: 42,
  },
};

const generatingProject = {
  ...approvedMasterPlotProject,
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
  });

  it("switches to the master-plot panel when the user clicks 主情节", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(approvedMasterPlotProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "主情节" }));

    expect(screen.getByRole("heading", { name: "主情节工作区" })).toBeInTheDocument();
    expect(screen.getByText(approvedMasterPlotProject.currentMasterPlot.synopsis)).toBeInTheDocument();
  });

  it("does not expose storyboard generation actions from the master-plot panel", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(approvedMasterPlotProject);
    const createStoryboardGenerateTask = vi.spyOn(
      apiModule.apiClient,
      "createStoryboardGenerateTask",
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "主情节" }));

    expect(screen.getByRole("heading", { name: "主情节工作区" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /生成主情节/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /生成分镜文案/i })).not.toBeInTheDocument();
    expect(createStoryboardGenerateTask).not.toHaveBeenCalled();
  });

  it("enables the storyboard panel after the master plot is approved", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(approvedMasterPlotProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));

    expect(screen.getByRole("heading", { name: "分镜工作区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /生成分镜文案/i })).toBeInTheDocument();
  });

  it("loads project detail and lets the user start storyboard generation", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(approvedMasterPlotProject);
    vi.spyOn(apiModule.apiClient, "createStoryboardGenerateTask").mockResolvedValue(runningTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));
    fireEvent.click(screen.getByRole("button", { name: /生成分镜文案/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.createStoryboardGenerateTask).toHaveBeenCalledWith("proj-1");
    });

    expect(screen.getByRole("heading", { name: "任务状态" })).toBeInTheDocument();
    expect(screen.getByText("执行中")).toBeInTheDocument();
  });

  it("refreshes generating storyboard projects even when no local task id is available", async () => {
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
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));
    expect(screen.getByText(/分镜文案生成中/)).toBeInTheDocument();
    expect(refreshTimer).toBeDefined();

    await act(async () => {
      refreshTimer?.();
      await flushMicrotasks();
    });

    expect(screen.getByRole("link", { name: /进入分镜审核/i })).toBeInTheDocument();
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
      .mockResolvedValueOnce(approvedMasterPlotProject)
      .mockResolvedValueOnce(reviewedProject);
    vi.spyOn(apiModule.apiClient, "createStoryboardGenerateTask").mockResolvedValue(runningTask);
    const getTaskDetail = vi
      .spyOn(apiModule.apiClient, "getTaskDetail")
      .mockResolvedValueOnce(runningTask)
      .mockResolvedValueOnce(succeededTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));
    fireEvent.click(screen.getByRole("button", { name: /生成分镜文案/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.createStoryboardGenerateTask).toHaveBeenCalledWith("proj-1");
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

    expect(screen.getByRole("link", { name: /进入分镜审核/i })).toBeInTheDocument();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("renders task failures from the polling response", async () => {
    let pollTimer: (() => void) | undefined;
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      pollTimer = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);

    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(approvedMasterPlotProject);
    vi.spyOn(apiModule.apiClient, "createStoryboardGenerateTask").mockResolvedValue(runningTask);
    const getTaskDetail = vi
      .spyOn(apiModule.apiClient, "getTaskDetail")
      .mockResolvedValue(failedTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));
    fireEvent.click(screen.getByRole("button", { name: /生成分镜文案/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.createStoryboardGenerateTask).toHaveBeenCalledWith("proj-1");
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
