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
  status: "script_ready" as const,
  storageDir: "/projects/proj-1",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  script: {
    path: "script/original.txt",
    bytes: 128,
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

const reviewedProject = {
  ...createdProject,
  status: "storyboard_in_review" as const,
  currentStoryboard: {
    id: "sbv-1",
    projectId: "proj-1",
    versionNumber: 1,
    kind: "ai" as const,
    provider: "gemini",
    model: "gemini-3.1-pro-preview",
    filePath: "storyboards/versions/v1-ai.json",
    createdAt: "2024-01-01T00:00:02Z",
    sourceTaskId: "task-1",
  },
};

const reviewWorkspace = {
  projectId: "proj-1",
  projectStatus: "storyboard_in_review" as const,
  currentStoryboard: {
    ...reviewedProject.currentStoryboard,
    summary: "Initial storyboard summary",
    scenes: [
      {
        id: "scene-1",
        sceneIndex: 1,
        description: "Opening shot",
        camera: "wide shot",
        characters: ["A"],
        prompt: "wide shot prompt",
      },
    ],
  },
  latestReview: null,
  availableActions: {
    saveHumanVersion: true,
    approve: true,
    reject: true,
  },
  latestStoryboardTask: null,
};

const refreshedWorkspace = {
  ...reviewWorkspace,
  currentStoryboard: {
    ...reviewWorkspace.currentStoryboard,
    id: "sbv-2",
    versionNumber: 2,
    kind: "human" as const,
    provider: "manual",
    model: "manual-edit",
    summary: "Updated storyboard summary",
    scenes: [
      {
        ...reviewWorkspace.currentStoryboard.scenes[0],
        description: "Updated opening shot",
      },
    ],
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

  it("completes the browser-only storyboard flow from create to reject-and-regenerate", async () => {
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
    vi.spyOn(apiModule.apiClient, "createStoryboardGenerateTask").mockResolvedValue(
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
    vi.spyOn(apiModule.apiClient, "saveHumanVersion").mockResolvedValue(
      refreshedWorkspace.currentStoryboard,
    );
    vi.spyOn(apiModule.apiClient, "rejectStoryboard").mockResolvedValue({
      id: "review-1",
      projectId: "proj-1",
      storyboardVersionId: "sbv-2",
      action: "reject",
      reason: "Try a different draft",
      triggeredTaskId: "task-2",
      createdAt: "2024-01-01T00:00:03Z",
    });

    renderApp();

    await waitFor(() => {
      expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("link", { name: /create project/i }));
    fireEvent.change(screen.getByLabelText("Project Name"), {
      target: { value: "Flow Project" },
    });
    fireEvent.change(screen.getByLabelText("Script"), {
      target: { value: "Scene 1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Project" }));

    await waitFor(() => {
      expect(apiModule.apiClient.createProject).toHaveBeenCalledWith({
        name: "Flow Project",
        script: "Scene 1",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Flow Project")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /generate storyboard/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.createStoryboardGenerateTask).toHaveBeenCalledWith(
        "proj-1",
      );
    });

    await act(async () => {
      pollTimer?.();
      await flushMicrotasks();
    });

    expect(screen.getByRole("link", { name: /enter review/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /enter review/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Initial storyboard summary")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Summary:"), {
      target: { value: "Updated storyboard summary" },
    });
    fireEvent.change(screen.getByLabelText("Description:"), {
      target: { value: "Updated opening shot" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.saveHumanVersion).toHaveBeenCalledWith("proj-1", {
        baseVersionId: "sbv-1",
        summary: "Updated storyboard summary",
        scenes: [
          {
            id: "scene-1",
            sceneIndex: 1,
            description: "Updated opening shot",
            camera: "wide shot",
            characters: ["A"],
            prompt: "wide shot prompt",
          },
        ],
      });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Updated storyboard summary")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.change(screen.getByPlaceholderText(/explain why/i), {
      target: { value: "Try a different draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit rejection/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.rejectStoryboard).toHaveBeenCalledWith("proj-1", {
        storyboardVersionId: "sbv-2",
        reason: "Try a different draft",
        nextAction: "regenerate",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Flow Project")).toBeInTheDocument();
    });
  });
});
