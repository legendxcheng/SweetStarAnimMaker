import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Layout } from "../../src/app/layout";
import { NewProjectPage } from "../../src/pages/new-project-page";
import { ProjectDetailPage } from "../../src/pages/project-detail-page";
import { ProjectsPage } from "../../src/pages/projects-page";
import { ReviewWorkspacePage } from "../../src/pages/review-workspace-page";
import * as apiModule from "../../src/services/api-client";

vi.mock("../../src/services/api-client");

const createdProject = {
  id: "proj-1",
  name: "Flow Project",
  slug: "flow-project",
  status: "premise_ready" as const,
  storageDir: "/projects/proj-1",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  premise: {
    path: "premise/v1.md",
    bytes: 128,
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

const reviewedProject = {
  ...createdProject,
  status: "master_plot_in_review" as const,
  currentMasterPlot: {
    id: "mp-1",
    title: "The Last Sky Choir",
    logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
    synopsis: "Rin hears the comet sing and discovers how to lift the drowned city.",
    mainCharacters: ["Rin", "Ivo"],
    coreConflict: "Rin must choose between escape and saving the city.",
    emotionalArc: "She moves from bitterness to sacrificial hope.",
    endingBeat: "The city rises on a final chorus of light.",
    targetDurationSec: 480,
    sourceTaskId: "task-1",
    updatedAt: "2024-01-01T00:00:02Z",
    approvedAt: null,
  },
};

const approvedProject = {
  ...createdProject,
  status: "master_plot_approved" as const,
  currentMasterPlot: {
    ...reviewedProject.currentMasterPlot,
    approvedAt: "2024-01-01T00:00:04Z",
  },
};

const reviewWorkspace = {
  projectId: "proj-1",
  projectStatus: "master_plot_in_review" as const,
  currentMasterPlot: reviewedProject.currentMasterPlot,
  latestReview: null,
  availableActions: {
    save: true,
    approve: true,
    reject: true,
  },
  latestTask: null,
};

const refreshedWorkspace = {
  ...reviewWorkspace,
  currentMasterPlot: {
    ...reviewWorkspace.currentMasterPlot,
    title: "The Last Sky Choir Revised",
    synopsis: "Updated master plot synopsis",
    updatedAt: "2024-01-01T00:00:03Z",
  },
};

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/projects"]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ProjectsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/new" element={<NewProjectPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="projects/:projectId/review" element={<ReviewWorkspacePage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("Spec5 Studio Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.alert = vi.fn();
  });

  it("completes the browser-only master-plot flow from create to reject-and-regenerate", async () => {
    let pollTimer: (() => void) | undefined;
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      pollTimer = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);
    vi.spyOn(global, "clearInterval").mockImplementation(() => undefined);

    vi.spyOn(apiModule.apiClient, "listProjects").mockResolvedValue([]);
    vi.spyOn(apiModule.apiClient, "createProject").mockResolvedValue(createdProject);
    vi.spyOn(apiModule.apiClient, "getProjectDetail")
      .mockResolvedValueOnce(createdProject)
      .mockResolvedValueOnce(reviewedProject)
      .mockResolvedValueOnce(createdProject);
    vi.spyOn(apiModule.apiClient, "createMasterPlotGenerateTask").mockResolvedValue(
      runningTask,
    );
    vi.spyOn(apiModule.apiClient, "getTaskDetail").mockResolvedValue({
      ...runningTask,
      status: "succeeded",
      finishedAt: "2024-01-01T00:00:02Z",
      updatedAt: "2024-01-01T00:00:02Z",
    });
    vi.spyOn(apiModule.apiClient, "getReviewWorkspace")
      .mockResolvedValueOnce(reviewWorkspace)
      .mockResolvedValueOnce(refreshedWorkspace);
    vi.spyOn(apiModule.apiClient, "saveMasterPlot").mockResolvedValue(
      refreshedWorkspace.currentMasterPlot,
    );
    vi.spyOn(apiModule.apiClient, "rejectMasterPlot").mockResolvedValue({
      id: "review-1",
      projectId: "proj-1",
      masterPlotId: "mp-1",
      action: "reject",
      reason: "Try a different draft",
      triggeredTaskId: "task-2",
      createdAt: "2024-01-01T00:00:03Z",
    });

    renderApp();

    await waitFor(() => {
      expect(screen.getByText(/还没有项目/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("link", { name: "创建项目" }));
    fireEvent.change(screen.getByLabelText("项目名称"), {
      target: { value: "Flow Project" },
    });
    fireEvent.change(screen.getByLabelText("项目前提"), {
      target: { value: "A washed-up pilot discovers a singing comet above a drowned city." },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建项目" }));

    await waitFor(() => {
      expect(apiModule.apiClient.createProject).toHaveBeenCalledWith({
        name: "Flow Project",
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Flow Project")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /生成主情节/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.createMasterPlotGenerateTask).toHaveBeenCalledWith(
        "proj-1",
      );
    });

    await act(async () => {
      pollTimer?.();
      await flushMicrotasks();
    });

    expect(screen.getByRole("link", { name: /进入审核/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /进入审核/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("The Last Sky Choir")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("标题"), {
      target: { value: "The Last Sky Choir Revised" },
    });
    fireEvent.change(screen.getByLabelText("剧情简介"), {
      target: { value: "Updated master plot synopsis" },
    });
    fireEvent.click(screen.getByRole("button", { name: /保存修改/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.saveMasterPlot).toHaveBeenCalledWith("proj-1", {
        title: "The Last Sky Choir Revised",
        logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
        synopsis: "Updated master plot synopsis",
        mainCharacters: ["Rin", "Ivo"],
        coreConflict: "Rin must choose between escape and saving the city.",
        emotionalArc: "She moves from bitterness to sacrificial hope.",
        endingBeat: "The city rises on a final chorus of light.",
        targetDurationSec: 480,
      });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("The Last Sky Choir Revised")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "驳回" }));
    fireEvent.change(screen.getByPlaceholderText(/请说明驳回原因/), {
      target: { value: "Try a different draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: /提交驳回/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.rejectMasterPlot).toHaveBeenCalledWith("proj-1", {
        reason: "Try a different draft",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Flow Project")).toBeInTheDocument();
    });
  });

  it("returns to project detail and shows approved status after approving the master plot", async () => {
    let pollTimer: (() => void) | undefined;
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      pollTimer = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);
    vi.spyOn(global, "clearInterval").mockImplementation(() => undefined);
    globalThis.confirm = vi.fn(() => true);

    vi.spyOn(apiModule.apiClient, "listProjects").mockResolvedValue([]);
    vi.spyOn(apiModule.apiClient, "createProject").mockResolvedValue(createdProject);
    vi.spyOn(apiModule.apiClient, "getProjectDetail")
      .mockResolvedValueOnce(createdProject)
      .mockResolvedValueOnce(reviewedProject)
      .mockResolvedValueOnce(approvedProject);
    vi.spyOn(apiModule.apiClient, "createMasterPlotGenerateTask").mockResolvedValue(
      runningTask,
    );
    vi.spyOn(apiModule.apiClient, "getTaskDetail").mockResolvedValue({
      ...runningTask,
      status: "succeeded",
      finishedAt: "2024-01-01T00:00:02Z",
      updatedAt: "2024-01-01T00:00:02Z",
    });
    vi.spyOn(apiModule.apiClient, "getReviewWorkspace").mockResolvedValue(reviewWorkspace);
    vi.spyOn(apiModule.apiClient, "approveMasterPlot").mockResolvedValue({
      id: "review-approve-1",
      projectId: "proj-1",
      masterPlotId: "mp-1",
      action: "approve",
      reason: null,
      triggeredTaskId: null,
      createdAt: "2024-01-01T00:00:04Z",
    });

    renderApp();

    await waitFor(() => {
      expect(screen.getByText(/还没有项目/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("link", { name: "创建项目" }));
    fireEvent.change(screen.getByLabelText("项目名称"), {
      target: { value: "Flow Project" },
    });
    fireEvent.change(screen.getByLabelText("项目前提"), {
      target: { value: "A washed-up pilot discovers a singing comet above a drowned city." },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建项目" }));

    await waitFor(() => {
      expect(screen.getByText("Flow Project")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /生成主情节/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.createMasterPlotGenerateTask).toHaveBeenCalledWith(
        "proj-1",
      );
    });

    await act(async () => {
      pollTimer?.();
      await flushMicrotasks();
    });

    fireEvent.click(screen.getByRole("link", { name: /进入审核/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "通过" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "通过" }));

    await waitFor(() => {
      expect(apiModule.apiClient.approveMasterPlot).toHaveBeenCalledWith("proj-1", {});
    });

    await waitFor(() => {
      expect(screen.getByText("已通过")).toBeInTheDocument();
    });

    expect(screen.queryByRole("link", { name: /进入审核/i })).not.toBeInTheDocument();
  });
});
