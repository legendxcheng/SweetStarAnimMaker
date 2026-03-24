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
    text: "A washed-up pilot discovers a singing comet above a drowned city.",
  },
  currentMasterPlot: null,
  currentCharacterSheetBatch: null,
  currentStoryboard: null,
  currentShotScript: null,
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

const masterPlotInReviewProject = {
  ...approvedMasterPlotProject,
  status: "master_plot_in_review" as const,
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

const runningMasterPlotTask = {
  ...runningTask,
  type: "master_plot_generate" as const,
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

const characterSheetsInReviewProject = {
  ...approvedMasterPlotProject,
  status: "character_sheets_in_review" as const,
  currentCharacterSheetBatch: {
    id: "char-batch-1",
    sourceMasterPlotId: "mp-1",
    characterCount: 2,
    approvedCharacterCount: 1,
    updatedAt: "2024-01-01T00:00:05Z",
  },
};

const characterSheetsApprovedProject = {
  ...approvedMasterPlotProject,
  status: "character_sheets_approved" as const,
  currentCharacterSheetBatch: {
    id: "char-batch-1",
    sourceMasterPlotId: "mp-1",
    characterCount: 2,
    approvedCharacterCount: 2,
    updatedAt: "2024-01-01T00:00:05Z",
  },
};

const storyboardApprovedProject = {
  ...approvedMasterPlotProject,
  status: "storyboard_approved" as const,
  currentStoryboard: {
    ...reviewedProject.currentStoryboard,
    approvedAt: "2024-01-01T00:00:05Z",
  },
};

const shotScriptInReviewProject = {
  ...storyboardApprovedProject,
  status: "shot_script_in_review" as const,
  currentShotScript: {
    id: "shot-script-1",
    title: "Episode 1 Shot Script",
    sourceStoryboardId: "storyboard-1",
    sourceTaskId: "task-shot-script-1",
    updatedAt: "2024-01-01T00:00:07Z",
    approvedAt: null,
    segmentCount: 1,
    shotCount: 3,
    totalDurationSec: 18,
  },
};

const shotScriptApprovedProject = {
  ...shotScriptInReviewProject,
  status: "shot_script_approved" as const,
  currentShotScript: {
    ...shotScriptInReviewProject.currentShotScript,
    approvedAt: "2024-01-01T00:00:08Z",
  },
};

const generatingShotScriptProject = {
  ...storyboardApprovedProject,
  status: "shot_script_generating" as const,
};

const fullShotScript = {
  id: "shot-script-1",
  title: "Episode 1 Shot Script",
  sourceStoryboardId: "storyboard-1",
  sourceTaskId: "task-shot-script-1",
  updatedAt: "2024-01-01T00:00:07Z",
  approvedAt: "2024-01-01T00:00:08Z",
  segmentCount: 1,
  shotCount: 1,
  totalDurationSec: 4,
  segments: [
    {
      segmentId: "segment-1",
      sceneId: "scene-1",
      order: 1,
      name: "雨夜码头",
      summary: "林夏第一次在暴雨码头听见异响。",
      durationSec: 4,
      status: "approved" as const,
      lastGeneratedAt: "2024-01-01T00:00:07Z",
      approvedAt: "2024-01-01T00:00:08Z",
      shots: [
        {
          id: "shot-1",
          sceneId: "scene-1",
          segmentId: "segment-1",
          order: 1,
          shotCode: "S01-SG01-SH01",
          purpose: "建立码头空间与不安感。",
          visual: "暴雨中的码头反着冷蓝色灯牌。",
          subject: "林夏",
          action: "林夏撑伞停在入口回头。",
          dialogue: null,
          os: "那声音又来了。",
          audio: "暴雨、风声、远处船笛。",
          transitionHint: "缓慢推近",
          continuityNotes: "黑伞保持右手持伞。",
          durationSec: 4,
        },
      ],
    },
  ],
};

const runningShotScriptTask = {
  ...runningTask,
  id: "task-shot-script-1",
  type: "shot_script_generate" as const,
};

const fullStoryboard = {
  id: "storyboard-1",
  title: "The Last Sky Choir",
  episodeTitle: "Episode 1",
  sourceMasterPlotId: "mp-1",
  sourceTaskId: "task-1",
  updatedAt: "2024-01-01T00:00:03Z",
  approvedAt: "2024-01-01T00:00:05Z",
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
    expect(screen.getByText("premise/v1.md")).toBeInTheDocument();
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

  it("shows the master-plot review entry while the project is in master-plot review", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(masterPlotInReviewProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "主情节" }));

    expect(screen.getByRole("heading", { name: "主情节工作区" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /进入主情节审核/i })).toHaveAttribute(
      "href",
      "/projects/proj-1/master-plot/review",
    );
  });

  it("starts master-plot generation from the master-plot panel", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);
    const createMasterPlotGenerateTask = vi
      .fn()
      .mockResolvedValue(runningMasterPlotTask);
    Object.assign(apiModule.apiClient as object, {
      createMasterPlotGenerateTask,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "主情节" }));

    expect(screen.getByRole("heading", { name: "主情节工作区" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /生成主情节/i }));

    await waitFor(() => {
      expect(createMasterPlotGenerateTask).toHaveBeenCalledWith("proj-1");
    });

    expect(screen.queryByRole("button", { name: /生成分镜文案/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "任务状态" })).toBeInTheDocument();
    expect(screen.getByText("执行中")).toBeInTheDocument();
  });

  it("shows the character phase after master plot approval and keeps storyboard disabled until approvals complete", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(approvedMasterPlotProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "角色设定" })).toBeEnabled();
    });

    expect(screen.getByRole("button", { name: "分镜" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "角色设定" }));

    expect(screen.getByRole("heading", { name: "角色设定工作区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /生成角色三视图/i })).toBeInTheDocument();
  });

  it("enables the storyboard panel after character sheets are approved", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(
      characterSheetsApprovedProject,
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));

    expect(screen.getByRole("heading", { name: "分镜工作区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /生成分镜文案/i })).toBeInTheDocument();
  });

  it("enables the shot-script panel after storyboard approval", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(storyboardApprovedProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "镜头脚本" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "镜头脚本" }));

    expect(screen.getByRole("heading", { name: "镜头脚本工作区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /生成镜头脚本/i })).toBeInTheDocument();
  });

  it("loads project detail and lets the user start storyboard generation", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(
      characterSheetsApprovedProject,
    );
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

  it("shows full current storyboard details in the storyboard phase panel", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(
      storyboardApprovedProject,
    );
    const getCurrentStoryboard = vi
      .spyOn(apiModule.apiClient, "getCurrentStoryboard")
      .mockResolvedValue(fullStoryboard);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));

    await waitFor(() => {
      expect(getCurrentStoryboard).toHaveBeenCalledWith("proj-1");
    });

    await waitFor(() => {
      expect(screen.getByText("Introduce Rin and the comet.")).toBeInTheDocument();
    });

    expect(screen.getByText("Rain shakes across the cockpit glass.")).toBeInTheDocument();
    expect(screen.getByText("That sound again.")).toBeInTheDocument();
    expect(screen.getByText("Start the mystery.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /进入分镜审核/i })).not.toBeInTheDocument();
  });

  it("shows an inline detail error while keeping the storyboard summary visible", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(
      storyboardApprovedProject,
    );
    vi.spyOn(apiModule.apiClient, "getCurrentStoryboard").mockRejectedValue(
      new Error("Storyboard detail unavailable"),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));

    await waitFor(() => {
      expect(screen.getByText(/Storyboard detail unavailable/i)).toBeInTheDocument();
    });

    expect(screen.getByText("当前分镜文案")).toBeInTheDocument();
    expect(screen.getByText("The Last Sky Choir")).toBeInTheDocument();
  });

  it("loads current shot-script details in the shot-script phase panel", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(shotScriptApprovedProject);
    const getCurrentShotScript = vi
      .spyOn(apiModule.apiClient, "getCurrentShotScript")
      .mockResolvedValue(fullShotScript);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "镜头脚本" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "镜头脚本" }));

    await waitFor(() => {
      expect(getCurrentShotScript).toHaveBeenCalledWith("proj-1");
    });

    await waitFor(() => {
      expect(screen.getByText("雨夜码头")).toBeInTheDocument();
    });

    expect(screen.getByText("林夏第一次在暴雨码头听见异响。")).toBeInTheDocument();
    expect(screen.getByText("S01-SG01-SH01")).toBeInTheDocument();
    expect(screen.getByText("暴雨中的码头反着冷蓝色灯牌。")).toBeInTheDocument();
    expect(screen.getByText("缓慢推近")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /进入镜头脚本审核/i })).not.toBeInTheDocument();
  });

  it("starts shot-script generation from the shot-script panel", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(storyboardApprovedProject);
    vi.spyOn(apiModule.apiClient, "createShotScriptGenerateTask").mockResolvedValue(
      runningShotScriptTask,
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "镜头脚本" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "镜头脚本" }));
    fireEvent.click(screen.getByRole("button", { name: /生成镜头脚本/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.createShotScriptGenerateTask).toHaveBeenCalledWith("proj-1");
    });

    expect(screen.getByRole("heading", { name: "任务状态" })).toBeInTheDocument();
    expect(screen.getByText("执行中")).toBeInTheDocument();
  });

  it("allows regenerating shot script after a shot script already exists", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(shotScriptApprovedProject);
    vi.spyOn(apiModule.apiClient, "getCurrentShotScript").mockResolvedValue(fullShotScript);
    vi.spyOn(apiModule.apiClient, "createShotScriptGenerateTask").mockResolvedValue(
      runningShotScriptTask,
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "镜头脚本" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "镜头脚本" }));

    const regenerateButton = await screen.findByRole("button", {
      name: "重新生成镜头脚本",
    });
    expect(regenerateButton).toBeEnabled();

    fireEvent.click(regenerateButton);

    await waitFor(() => {
      expect(apiModule.apiClient.createShotScriptGenerateTask).toHaveBeenCalledWith("proj-1");
    });
  });

  it("shows the shot-script review entry after generation completes", async () => {
    let refreshTimer: (() => void) | undefined;
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      refreshTimer = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);

    vi.spyOn(apiModule.apiClient, "getProjectDetail")
      .mockResolvedValueOnce(generatingShotScriptProject)
      .mockResolvedValueOnce(shotScriptInReviewProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "镜头脚本" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "镜头脚本" }));
    expect(screen.getByText(/镜头脚本生成中/)).toBeInTheDocument();

    await act(async () => {
      refreshTimer?.();
      await flushMicrotasks();
    });

    expect(screen.getByRole("link", { name: /进入镜头脚本审核/i })).toHaveAttribute(
      "href",
      "/projects/proj-1/shot-script/review",
    );
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

    expect(screen.getByRole("link", { name: /进入分镜审核/i })).toHaveAttribute(
      "href",
      "/projects/proj-1/storyboard/review",
    );
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
      .mockResolvedValueOnce(characterSheetsApprovedProject)
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

    expect(screen.getByRole("link", { name: /进入分镜审核/i })).toHaveAttribute(
      "href",
      "/projects/proj-1/storyboard/review",
    );
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("renders task failures from the polling response", async () => {
    let pollTimer: (() => void) | undefined;
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      pollTimer = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);

    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(
      characterSheetsApprovedProject,
    );
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

  it("loads the character phase when character sheets are in review and keeps storyboard locked", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(
      characterSheetsInReviewProject,
    );
    vi.spyOn(apiModule.apiClient, "listCharacterSheets").mockResolvedValue({
      currentBatch: characterSheetsInReviewProject.currentCharacterSheetBatch,
      characters: [
        {
          id: "char-rin",
          projectId: "proj-1",
          batchId: "char-batch-1",
          sourceMasterPlotId: "mp-1",
          characterName: "Rin",
          promptTextGenerated: "silver pilot jacket",
          promptTextCurrent: "silver pilot jacket",
          imageAssetPath: "character-sheets/char-rin/current.png",
          imageWidth: 1536,
          imageHeight: 1024,
          provider: "turnaround-image",
          model: "imagen-4.0-generate-preview",
          status: "in_review" as const,
          updatedAt: "2024-01-01T00:00:05Z",
          approvedAt: null,
          sourceTaskId: "task-char-rin",
        },
      ],
    });
    vi.spyOn(apiModule.apiClient, "getCharacterSheet").mockResolvedValue({
      id: "char-rin",
      projectId: "proj-1",
      batchId: "char-batch-1",
      sourceMasterPlotId: "mp-1",
      characterName: "Rin",
      promptTextGenerated: "silver pilot jacket",
      promptTextCurrent: "silver pilot jacket",
      imageAssetPath: "character-sheets/char-rin/current.png",
      imageWidth: 1536,
      imageHeight: 1024,
      provider: "turnaround-image",
      model: "imagen-4.0-generate-preview",
      status: "in_review",
      updatedAt: "2024-01-01T00:00:05Z",
      approvedAt: null,
      sourceTaskId: "task-char-rin",
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "角色设定" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "角色设定" }));

    await waitFor(() => {
      expect(screen.getByText("Rin")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "分镜" })).toBeDisabled();
  });
});
