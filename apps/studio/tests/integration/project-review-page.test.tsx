import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { MasterPlotReviewPage } from "../../src/pages/master-plot-review-page";
import { ReviewWorkspacePage } from "../../src/pages/review-workspace-page";
import { ShotScriptReviewPage } from "../../src/pages/shot-script-review-page";
import * as apiModule from "../../src/services/api-client";

vi.mock("../../src/services/api-client");

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

const refreshedWorkspace = {
  ...workspace,
  currentStoryboard: {
    ...workspace.currentStoryboard,
    title: "The Last Sky Choir Revised",
    scenes: [
      {
        ...workspace.currentStoryboard.scenes[0],
        dramaticPurpose: "Sharpen the inciting beat.",
      },
    ],
    updatedAt: "2024-01-01T00:00:02Z",
  },
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

const refreshedShotScriptWorkspace = {
  ...shotScriptWorkspace,
  currentShotScript: {
    ...shotScriptWorkspace.currentShotScript,
    updatedAt: "2024-01-01T00:00:02Z",
    segments: [
      {
        ...shotScriptWorkspace.currentShotScript.segments[0],
        name: "雨夜码头加强版",
        shots: [
          {
            ...shotScriptWorkspace.currentShotScript.segments[0].shots[0],
            transitionHint: "缓慢推近",
          },
        ],
      },
    ],
  },
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

describe("Project Review Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.alert = vi.fn();
  });

  it("loads the workspace and renders editable storyboard fields", async () => {
    vi.spyOn(apiModule.apiClient, "getStoryboardReviewWorkspace").mockResolvedValue(workspace);

    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("The Last Sky Choir")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("Episode 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Opening")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Rain shakes across the cockpit glass."),
    ).toBeInTheDocument();
  });

  it("loads the master-plot workspace and renders editable fields", async () => {
    vi.spyOn(apiModule.apiClient, "getMasterPlotReviewWorkspace").mockResolvedValue(
      masterPlotWorkspace,
    );

    renderMasterPlotPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "主情节审核" })).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("The Last Sky Choir")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("A disgraced pilot chases a cosmic song to save her flooded home."),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Rin, Ivo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("480")).toBeInTheDocument();
  });

  it("loads the shot-script workspace and renders editable segment shot fields", async () => {
    vi.spyOn(apiModule.apiClient, "getShotScriptReviewWorkspace").mockResolvedValue(
      shotScriptWorkspace,
    );

    renderShotScriptPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "镜头脚本审核" })).toBeInTheDocument();
    });

    expect(screen.getByText("Episode 1 Shot Script")).toBeInTheDocument();
    expect(screen.getByDisplayValue("雨夜码头")).toBeInTheDocument();
    expect(screen.getByDisplayValue("S01-SG01-SH01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("暴雨中的码头反着冷蓝色灯牌。")).toBeInTheDocument();
  });

  it("saves the edited draft and refreshes the workspace", async () => {
    vi.spyOn(apiModule.apiClient, "getStoryboardReviewWorkspace")
      .mockResolvedValueOnce(workspace)
      .mockResolvedValueOnce(refreshedWorkspace);
    vi.spyOn(apiModule.apiClient, "saveStoryboard").mockResolvedValue(
      refreshedWorkspace.currentStoryboard,
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("The Last Sky Choir")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("标题"), {
      target: { value: "The Last Sky Choir Revised" },
    });
    fireEvent.change(screen.getByLabelText("场景 1 戏剧目的"), {
      target: { value: "Sharpen the inciting beat." },
    });

    fireEvent.click(screen.getByRole("button", { name: /保存修改/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.saveStoryboard).toHaveBeenCalledWith("proj-1", {
        title: "The Last Sky Choir Revised",
        episodeTitle: "Episode 1",
        sourceMasterPlotId: "mp-1",
        sourceTaskId: "task-1",
        scenes: [
          {
            id: "scene-1",
            order: 1,
            name: "Opening",
            dramaticPurpose: "Sharpen the inciting beat.",
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
      });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("The Last Sky Choir Revised")).toBeInTheDocument();
    });
  });

  it("keeps edited draft values visible when save fails", async () => {
    vi.spyOn(apiModule.apiClient, "getStoryboardReviewWorkspace").mockResolvedValue(workspace);
    vi.spyOn(apiModule.apiClient, "saveStoryboard").mockRejectedValue(
      new Error("Version conflict"),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("The Last Sky Choir")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("标题"), {
      target: { value: "Draft title that should stay visible" },
    });

    fireEvent.click(screen.getByRole("button", { name: /保存修改/i }));

    await waitFor(() => {
      expect(globalThis.alert).toHaveBeenCalledWith("保存失败：Version conflict");
    });

    expect(screen.getByDisplayValue("Draft title that should stay visible")).toBeInTheDocument();
  });

  it("saves the edited segment draft and refreshes the workspace", async () => {
    vi.spyOn(apiModule.apiClient, "getShotScriptReviewWorkspace")
      .mockResolvedValueOnce(shotScriptWorkspace)
      .mockResolvedValueOnce(refreshedShotScriptWorkspace);
    vi.spyOn(apiModule.apiClient, "saveShotScriptSegment").mockResolvedValue(
      refreshedShotScriptWorkspace.currentShotScript,
    );

    renderShotScriptPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("雨夜码头")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("段落 1 标题"), {
      target: { value: "雨夜码头加强版" },
    });
    fireEvent.change(screen.getByLabelText("镜头 1 转场提示"), {
      target: { value: "缓慢推近" },
    });

    fireEvent.click(screen.getByRole("button", { name: /保存本段/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.saveShotScriptSegment).toHaveBeenCalledWith(
        "proj-1",
        "scene-1:segment-1",
        {
          name: "雨夜码头加强版",
          summary: "林夏在暴雨码头听见异响。",
          durationSec: 4,
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
              transitionHint: "缓慢推近",
              continuityNotes: "黑伞保持右手持伞。",
              durationSec: 4,
            },
          ],
        },
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("雨夜码头加强版")).toBeInTheDocument();
    });
  });
});
