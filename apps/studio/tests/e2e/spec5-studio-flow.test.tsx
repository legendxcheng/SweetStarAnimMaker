import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    text: "A washed-up pilot discovers a singing comet above a drowned city.",
    visualStyleText: "",
  },
  currentMasterPlot: null,
  currentCharacterSheetBatch: null,
  currentStoryboard: null,
  currentShotScript: null,
  currentImageBatch: null,
};

const masterPlotApprovedProject = {
  ...createdProject,
  status: "master_plot_approved" as const,
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
    sourceTaskId: "task-master-plot",
    updatedAt: "2024-01-01T00:00:02Z",
    approvedAt: "2024-01-01T00:00:03Z",
  },
};

const characterSheetsApprovedProject = {
  ...masterPlotApprovedProject,
  status: "character_sheets_approved" as const,
  currentCharacterSheetBatch: {
    id: "char-batch-1",
    sourceMasterPlotId: "mp-1",
    characterCount: 2,
    approvedCharacterCount: 2,
    updatedAt: "2024-01-01T00:00:03Z",
  },
};

const rinCharacter = {
  id: "char-rin",
  projectId: "proj-1",
  batchId: "char-batch-1",
  sourceMasterPlotId: "mp-1",
  characterName: "Rin",
  promptTextGenerated: "silver pilot jacket",
  promptTextCurrent: "silver pilot jacket",
  referenceImages: [],
  imageAssetPath: "character-sheets/char-rin/current.png",
  imageWidth: 1536,
  imageHeight: 1024,
  provider: "turnaround-image",
  model: "imagen-4.0-generate-preview",
  status: "approved" as const,
  updatedAt: "2024-01-01T00:00:05Z",
  approvedAt: "2024-01-01T00:00:06Z",
  sourceTaskId: "task-char-rin",
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

const storyboardInReviewProject = {
  ...characterSheetsApprovedProject,
  status: "storyboard_in_review" as const,
  currentStoryboard: {
    id: "storyboard-1",
    title: "The Last Sky Choir",
    episodeTitle: "Episode 1",
    sourceMasterPlotId: "mp-1",
    sourceTaskId: "task-1",
    updatedAt: "2024-01-01T00:00:04Z",
    approvedAt: null,
    sceneCount: 2,
    segmentCount: 5,
    totalDurationSec: 42,
  },
};

const storyboardApprovedProject = {
  ...storyboardInReviewProject,
  status: "storyboard_approved" as const,
  currentStoryboard: {
    ...storyboardInReviewProject.currentStoryboard,
    approvedAt: "2024-01-01T00:00:05Z",
  },
};

const reviewWorkspace = {
  projectId: "proj-1",
  projectName: "Flow Project",
  projectStatus: "storyboard_in_review" as const,
  currentStoryboard: {
    id: "storyboard-1",
    title: "The Last Sky Choir",
    episodeTitle: "Episode 1",
    sourceMasterPlotId: "mp-1",
    sourceTaskId: "task-1",
    updatedAt: "2024-01-01T00:00:04Z",
    approvedAt: null,
    scenes: [
      {
        id: "scene-1",
        order: 1,
        name: "Opening",
        dramaticPurpose: "Introduce Rin and the comet.",
        segments: [
          {
            id: "segment-1",
            order: 1,
            durationSec: 6,
            visual: "Rain shakes across the cockpit glass.",
            characterAction: "Rin looks up.",
            dialogue: "",
            voiceOver: "That sound again.",
            audio: "A comet hum under thunder.",
            purpose: "Start the mystery.",
          },
        ],
      },
    ],
  },
  availableActions: {
    save: true,
    approve: true,
    reject: true,
  },
  latestTask: null,
};

const refreshedWorkspace = {
  ...reviewWorkspace,
  currentStoryboard: {
    ...reviewWorkspace.currentStoryboard,
    title: "The Last Sky Choir Revised",
    updatedAt: "2024-01-01T00:00:05Z",
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
          <Route
            path="projects/:projectId/storyboard/review"
            element={<ReviewWorkspacePage />}
          />
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
    vi.restoreAllMocks();
    vi.clearAllMocks();
    globalThis.alert = vi.fn();
    globalThis.confirm = vi.fn(() => true);
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
    vi.spyOn(apiModule.apiClient, "listCharacterSheets").mockResolvedValue({
      currentBatch: characterSheetsApprovedProject.currentCharacterSheetBatch,
      characters: [rinCharacter],
    });
    vi.spyOn(apiModule.apiClient, "getCharacterSheet").mockResolvedValue(rinCharacter);
    vi.spyOn(apiModule.apiClient, "getProjectDetail")
      .mockResolvedValueOnce(characterSheetsApprovedProject)
      .mockResolvedValueOnce(storyboardInReviewProject)
      .mockResolvedValueOnce(characterSheetsApprovedProject);
    vi.spyOn(apiModule.apiClient, "regenerateStoryboard").mockResolvedValue(runningTask);
    vi.spyOn(apiModule.apiClient, "getTaskDetail").mockResolvedValue({
      ...runningTask,
      status: "succeeded",
      finishedAt: "2024-01-01T00:00:02Z",
      updatedAt: "2024-01-01T00:00:02Z",
    });
    vi.spyOn(apiModule.apiClient, "getStoryboardReviewWorkspace")
      .mockResolvedValueOnce(reviewWorkspace)
      .mockResolvedValueOnce(reviewWorkspace)
      .mockResolvedValueOnce(refreshedWorkspace);
    vi.spyOn(apiModule.apiClient, "saveStoryboard").mockResolvedValue(
      refreshedWorkspace.currentStoryboard,
    );
    vi.spyOn(apiModule.apiClient, "rejectStoryboard").mockResolvedValue({
      id: "task-2",
      projectId: "proj-1",
      type: "storyboard_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:05Z",
      updatedAt: "2024-01-01T00:00:05Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-2/input.json",
        outputPath: "tasks/task-2/output.json",
        logPath: "tasks/task-2/log.txt",
      },
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
        visualStyleText: "",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Flow Project")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));
    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));

    await waitFor(() => {
      expect(apiModule.apiClient.regenerateStoryboard).toHaveBeenCalledWith("proj-1");
    });

    await act(async () => {
      pollTimer?.();
      await flushMicrotasks();
    });

    expect(screen.getByRole("link", { name: /进入分镜审核/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /进入分镜审核/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("The Last Sky Choir")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("标题"), {
      target: { value: "The Last Sky Choir Revised" },
    });
    fireEvent.click(screen.getByRole("button", { name: /保存修改/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.saveStoryboard).toHaveBeenCalledWith("proj-1", {
        title: "The Last Sky Choir Revised",
        episodeTitle: "Episode 1",
        sourceMasterPlotId: "mp-1",
        sourceTaskId: "task-1",
        scenes: reviewWorkspace.currentStoryboard.scenes,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "驳回" }));

    await waitFor(() => {
      expect(apiModule.apiClient.rejectStoryboard).toHaveBeenCalledWith("proj-1", {});
    });

    await waitFor(() => {
      expect(screen.getByText("Flow Project")).toBeInTheDocument();
    });
  });

  it("returns to project detail and shows approved status after approving the storyboard", async () => {
    let pollTimer: (() => void) | undefined;
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      pollTimer = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);
    vi.spyOn(global, "clearInterval").mockImplementation(() => undefined);

    vi.spyOn(apiModule.apiClient, "listProjects").mockResolvedValue([]);
    vi.spyOn(apiModule.apiClient, "createProject").mockResolvedValue(createdProject);
    vi.spyOn(apiModule.apiClient, "listCharacterSheets").mockResolvedValue({
      currentBatch: characterSheetsApprovedProject.currentCharacterSheetBatch,
      characters: [rinCharacter],
    });
    vi.spyOn(apiModule.apiClient, "getCharacterSheet").mockResolvedValue(rinCharacter);
    vi.spyOn(apiModule.apiClient, "getProjectDetail")
      .mockResolvedValueOnce(characterSheetsApprovedProject)
      .mockResolvedValueOnce(storyboardInReviewProject)
      .mockResolvedValueOnce(storyboardApprovedProject);
    vi.spyOn(apiModule.apiClient, "regenerateStoryboard").mockResolvedValue(runningTask);
    vi.spyOn(apiModule.apiClient, "getTaskDetail").mockResolvedValue({
      ...runningTask,
      status: "succeeded",
      finishedAt: "2024-01-01T00:00:02Z",
      updatedAt: "2024-01-01T00:00:02Z",
    });
    vi.spyOn(apiModule.apiClient, "getStoryboardReviewWorkspace").mockResolvedValue(
      reviewWorkspace,
    );
    vi.spyOn(apiModule.apiClient, "approveStoryboard").mockResolvedValue({
      ...reviewWorkspace.currentStoryboard,
      approvedAt: "2024-01-01T00:00:05Z",
      updatedAt: "2024-01-01T00:00:05Z",
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

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));
    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));

    await waitFor(() => {
      expect(apiModule.apiClient.regenerateStoryboard).toHaveBeenCalledWith("proj-1");
    });

    await act(async () => {
      pollTimer?.();
      await flushMicrotasks();
    });

    fireEvent.click(screen.getByRole("link", { name: /进入分镜审核/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "通过" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "通过" }));

    await waitFor(() => {
      expect(apiModule.apiClient.approveStoryboard).toHaveBeenCalledWith("proj-1", {});
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "镜头脚本" })).toBeEnabled();
    });

    expect(screen.queryByRole("link", { name: /进入分镜审核/i })).not.toBeInTheDocument();
  });
});
