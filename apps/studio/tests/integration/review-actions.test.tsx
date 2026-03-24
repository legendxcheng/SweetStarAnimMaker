import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { MasterPlotReviewPage } from "../../src/pages/master-plot-review-page";
import { ReviewWorkspacePage } from "../../src/pages/review-workspace-page";
import { ShotScriptReviewPage } from "../../src/pages/shot-script-review-page";
import * as apiModule from "../../src/services/api-client";

const navigate = vi.fn();

vi.mock("../../src/services/api-client");
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );

  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

const workspace = {
  projectId: "proj-1",
  projectName: "Test Project",
  projectStatus: "storyboard_in_review" as const,
  currentStoryboard: {
    id: "storyboard-1",
    title: "The Last Sky Choir",
    episodeTitle: "Episode 1",
    sourceMasterPlotId: "mp-1",
    sourceTaskId: "task-1",
    updatedAt: "2024-01-01T00:00:00Z",
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

const masterPlotProjectDetail = {
  id: "proj-1",
  name: "Test Project",
  slug: "test-project",
  status: "master_plot_in_review" as const,
  storageDir: "/path/to/project",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  premise: {
    path: "premise/v1.md",
    bytes: 42,
    updatedAt: "2024-01-01T00:00:00Z",
  },
  currentMasterPlot: {
    id: "mp-1",
    title: "The Last Sky Choir",
    logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
    synopsis:
      "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
    mainCharacters: ["Rin", "Ivo"],
    coreConflict:
      "Rin must choose between private escape and saving the city that exiled her.",
    emotionalArc: "She moves from bitterness to sacrificial hope.",
    endingBeat: "Rin turns the comet's music into a rising tide of light.",
    targetDurationSec: 480,
    sourceTaskId: "task-master-plot",
    updatedAt: "2024-01-01T00:00:00Z",
    approvedAt: null,
  },
  currentCharacterSheetBatch: null,
  currentStoryboard: null,
};

const masterPlotWorkspace = {
  projectId: "proj-1",
  projectStatus: "master_plot_in_review" as const,
  currentMasterPlot: masterPlotProjectDetail.currentMasterPlot,
  latestReview: null,
  availableActions: {
    save: true,
    approve: true,
    reject: true,
  },
  latestTask: null,
};

const shotScriptWorkspace = {
  projectId: "proj-1",
  projectName: "Test Project",
  projectStatus: "shot_script_in_review" as const,
  currentShotScript: {
    id: "shot-script-1",
    title: "Episode 1 Shot Script",
    sourceStoryboardId: "storyboard-1",
    sourceTaskId: "task-shot-script-1",
    updatedAt: "2024-01-01T00:00:00Z",
    approvedAt: null,
    segmentCount: 1,
    shotCount: 1,
    totalDurationSec: 4,
    segments: [
      {
        segmentId: "segment-1",
        sceneId: "scene-1",
        order: 1,
        name: "雨夜码头",
        summary: "林夏在暴雨码头听见异响。",
        durationSec: 4,
        status: "in_review" as const,
        lastGeneratedAt: "2024-01-01T00:00:00Z",
        approvedAt: null,
        shots: [
          {
            id: "shot-1",
            sceneId: "scene-1",
            segmentId: "segment-1",
            order: 1,
            shotCode: "S01-SG01-SH01",
            purpose: "建立码头空间。",
            visual: "暴雨中的码头反着冷蓝色灯牌。",
            subject: "林夏",
            action: "林夏撑伞穿过码头入口。",
            dialogue: null,
            os: "今晚绝不能出错。",
            audio: "暴雨、风声、船笛。",
            transitionHint: null,
            continuityNotes: "黑伞保持右手持伞。",
            durationSec: 4,
          },
        ],
      },
    ],
  },
  latestReview: null,
  latestTask: null,
  availableActions: {
    saveSegment: true,
    regenerateSegment: true,
    approveSegment: true,
    approveAll: true,
  },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/projects/proj-1/storyboard/review"]}>
      <Routes>
        <Route
          path="/projects/:projectId/storyboard/review"
          element={<ReviewWorkspacePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function renderMasterPlotPage() {
  return render(
    <MemoryRouter initialEntries={["/projects/proj-1/master-plot/review"]}>
      <Routes>
        <Route
          path="/projects/:projectId/master-plot/review"
          element={<MasterPlotReviewPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function renderShotScriptPage() {
  return render(
    <MemoryRouter initialEntries={["/projects/proj-1/shot-script/review"]}>
      <Routes>
        <Route
          path="/projects/:projectId/shot-script/review"
          element={<ShotScriptReviewPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

describe("Review Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.alert = vi.fn();
    globalThis.confirm = vi.fn(() => true);
    globalThis.prompt = vi.fn(() => "Need a stronger ending beat.");
    vi.spyOn(apiModule.apiClient, "getStoryboardReviewWorkspace").mockResolvedValue(workspace);
    vi.spyOn(apiModule.apiClient, "getShotScriptReviewWorkspace").mockResolvedValue(
      shotScriptWorkspace,
    );
  });

  it("disables action buttons while approve is in flight", async () => {
    const deferred = createDeferred({
      ...workspace.currentStoryboard,
      approvedAt: "2024-01-01T00:00:01Z",
      updatedAt: "2024-01-01T00:00:01Z",
    });
    vi.spyOn(apiModule.apiClient, "approveStoryboard").mockReturnValue(deferred.promise);

    renderPage();

    const approveButton = await screen.findByRole("button", { name: "通过" });
    const rejectButton = screen.getByRole("button", { name: "驳回" });

    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(apiModule.apiClient.approveStoryboard).toHaveBeenCalledWith("proj-1", {});
    });

    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();

    deferred.resolve({
      ...workspace.currentStoryboard,
      approvedAt: "2024-01-01T00:00:01Z",
      updatedAt: "2024-01-01T00:00:01Z",
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
    });
  });

  it("rejects and redirects back to the project detail page", async () => {
    vi.spyOn(apiModule.apiClient, "rejectStoryboard").mockResolvedValue({
      id: "task-2",
      projectId: "proj-1",
      type: "storyboard_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:02Z",
      updatedAt: "2024-01-01T00:00:02Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-2/input.json",
        outputPath: "tasks/task-2/output.json",
        logPath: "tasks/task-2/log.txt",
      },
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "驳回" }));

    await waitFor(() => {
      expect(apiModule.apiClient.rejectStoryboard).toHaveBeenCalledWith("proj-1", {});
    });

    expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
  });

  it("does not reject when the user cancels confirmation", async () => {
    globalThis.confirm = vi.fn(() => false);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "驳回" }));

    expect(apiModule.apiClient.rejectStoryboard).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("approves the master plot and redirects back to the project detail page", async () => {
    vi.spyOn(apiModule.apiClient, "getMasterPlotReviewWorkspace").mockResolvedValue(
      masterPlotWorkspace,
    );
    vi.spyOn(apiModule.apiClient, "approveMasterPlot").mockResolvedValue({
      ...masterPlotWorkspace.currentMasterPlot,
      approvedAt: "2024-01-01T00:00:01Z",
      updatedAt: "2024-01-01T00:00:01Z",
    });

    renderMasterPlotPage();

    fireEvent.click(await screen.findByRole("button", { name: "通过" }));

    await waitFor(() => {
      expect(apiModule.apiClient.approveMasterPlot).toHaveBeenCalledWith("proj-1", {});
    });

    expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
  });

  it("rejects the master plot with a required reason and redirects back to the project detail page", async () => {
    vi.spyOn(apiModule.apiClient, "getMasterPlotReviewWorkspace").mockResolvedValue(
      masterPlotWorkspace,
    );
    vi.spyOn(apiModule.apiClient, "rejectMasterPlot").mockResolvedValue({
      id: "task-2",
      projectId: "proj-1",
      type: "master_plot_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:02Z",
      updatedAt: "2024-01-01T00:00:02Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-2/input.json",
        outputPath: "tasks/task-2/output.json",
        logPath: "tasks/task-2/log.txt",
      },
    });

    renderMasterPlotPage();

    fireEvent.click(await screen.findByRole("button", { name: "驳回" }));

    await waitFor(() => {
      expect(apiModule.apiClient.rejectMasterPlot).toHaveBeenCalledWith("proj-1", {
        reason: "Need a stronger ending beat.",
      });
    });

    expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
  });

  it("approves the current shot-script segment and redirects when the whole draft becomes approved", async () => {
    vi.spyOn(apiModule.apiClient, "approveShotScriptSegment").mockResolvedValue({
      ...shotScriptWorkspace.currentShotScript,
      approvedAt: "2024-01-01T00:00:01Z",
      updatedAt: "2024-01-01T00:00:01Z",
      segments: [
        {
          ...shotScriptWorkspace.currentShotScript.segments[0],
          status: "approved",
          approvedAt: "2024-01-01T00:00:01Z",
        },
      ],
    });

    renderShotScriptPage();

    fireEvent.click(await screen.findByRole("button", { name: "通过本段" }));

    await waitFor(() => {
      expect(apiModule.apiClient.approveShotScriptSegment).toHaveBeenCalledWith(
        "proj-1",
        "scene-1:segment-1",
        {},
      );
    });

    expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
  });

  it("regenerates the current shot-script segment and refreshes the workspace", async () => {
    vi.spyOn(apiModule.apiClient, "regenerateShotScriptSegment").mockResolvedValue({
      id: "task-3",
      projectId: "proj-1",
      type: "shot_script_segment_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:02Z",
      updatedAt: "2024-01-01T00:00:02Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-3/input.json",
        outputPath: "tasks/task-3/output.json",
        logPath: "tasks/task-3/log.txt",
      },
    });

    renderShotScriptPage();

    fireEvent.click(await screen.findByRole("button", { name: "重生成本段" }));

    await waitFor(() => {
      expect(apiModule.apiClient.regenerateShotScriptSegment).toHaveBeenCalledWith(
        "proj-1",
        "scene-1:segment-1",
        {},
      );
    });

    expect(apiModule.apiClient.getShotScriptReviewWorkspace).toHaveBeenCalledTimes(2);
  });

  it("approves all shot-script segments and redirects back to the project detail page", async () => {
    vi.spyOn(apiModule.apiClient, "approveAllShotScriptSegments").mockResolvedValue({
      ...shotScriptWorkspace.currentShotScript,
      approvedAt: "2024-01-01T00:00:02Z",
      updatedAt: "2024-01-01T00:00:02Z",
      segments: [
        {
          ...shotScriptWorkspace.currentShotScript.segments[0],
          status: "approved",
          approvedAt: "2024-01-01T00:00:02Z",
        },
      ],
    });

    renderShotScriptPage();

    fireEvent.click(await screen.findByRole("button", { name: "全部通过" }));

    await waitFor(() => {
      expect(apiModule.apiClient.approveAllShotScriptSegments).toHaveBeenCalledWith("proj-1", {});
    });

    expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
  });

  it("uses a scene-aware selector for shot-script actions when raw segment ids repeat", async () => {
    vi.spyOn(apiModule.apiClient, "getShotScriptReviewWorkspace").mockResolvedValue({
      ...shotScriptWorkspace,
      currentShotScript: {
        ...shotScriptWorkspace.currentShotScript,
        segmentCount: 2,
        shotCount: 2,
        totalDurationSec: 8,
        segments: [
          {
            ...shotScriptWorkspace.currentShotScript.segments[0],
            segmentId: "segment-1",
            sceneId: "scene-1",
            name: "第一场",
          },
          {
            ...shotScriptWorkspace.currentShotScript.segments[0],
            segmentId: "segment-1",
            sceneId: "scene-2",
            name: "第二场",
            shots: [
              {
                ...shotScriptWorkspace.currentShotScript.segments[0].shots[0],
                id: "shot-2",
                sceneId: "scene-2",
              },
            ],
          },
        ],
      },
    });
    vi.spyOn(apiModule.apiClient, "approveShotScriptSegment").mockResolvedValue({
      ...shotScriptWorkspace.currentShotScript,
      approvedAt: null,
      segments: [
        {
          ...shotScriptWorkspace.currentShotScript.segments[0],
          segmentId: "segment-1",
          sceneId: "scene-1",
          status: "in_review",
          approvedAt: null,
        },
        {
          ...shotScriptWorkspace.currentShotScript.segments[0],
          segmentId: "segment-1",
          sceneId: "scene-2",
          status: "approved",
          approvedAt: "2024-01-01T00:00:01Z",
        },
      ],
    });

    renderShotScriptPage();

    const approveButtons = await screen.findAllByRole("button", { name: "通过本段" });
    fireEvent.click(approveButtons[1]!);

    await waitFor(() => {
      expect(apiModule.apiClient.approveShotScriptSegment).toHaveBeenCalledWith(
        "proj-1",
        "scene-2:segment-1",
        {},
      );
    });
  });
});
