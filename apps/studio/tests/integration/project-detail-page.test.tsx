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
  videoReferenceStrategy: "auto" as const,
  storageDir: "/path/to/project",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  premise: {
    path: "premise/v1.md",
    bytes: 42,
    updatedAt: "2024-01-01T00:00:00Z",
    text: "A washed-up pilot discovers a singing comet above a drowned city.",
    visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
  },
  currentMasterPlot: null,
  currentCharacterSheetBatch: null,
  currentSceneSheetBatch: null,
  currentStoryboard: null,
  currentShotScript: null,
  currentImageBatch: null,
  currentVideoBatch: null,
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

const generatingMasterPlotProject = {
  ...baseProject,
  status: "master_plot_generating" as const,
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

const succeededMasterPlotTask = {
  ...runningMasterPlotTask,
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

const sceneSheetsInReviewProject = {
  ...characterSheetsApprovedProject,
  status: "scene_sheets_in_review" as const,
  currentSceneSheetBatch: {
    id: "scene-batch-1",
    sourceMasterPlotId: "mp-1",
    sourceCharacterSheetBatchId: "char-batch-1",
    sceneCount: 2,
    approvedSceneCount: 1,
    updatedAt: "2024-01-01T00:00:06Z",
  },
};

const sceneSheetsApprovedProject = {
  ...characterSheetsApprovedProject,
  status: "scene_sheets_approved" as const,
  currentSceneSheetBatch: {
    id: "scene-batch-1",
    sourceMasterPlotId: "mp-1",
    sourceCharacterSheetBatchId: "char-batch-1",
    sceneCount: 2,
    approvedSceneCount: 2,
    updatedAt: "2024-01-01T00:00:06Z",
  },
};

const storyboardApprovedProject = {
  ...sceneSheetsApprovedProject,
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

const shotScriptApprovedSummaryProject = {
  ...shotScriptInReviewProject,
  status: "shot_script_in_review" as const,
  currentShotScript: {
    ...shotScriptInReviewProject.currentShotScript,
    approvedAt: "2024-01-01T00:00:08Z",
  },
};

const imagesInReviewProject = {
  ...shotScriptApprovedProject,
  status: "images_in_review" as const,
  currentImageBatch: {
    id: "image-batch-1",
    sourceShotScriptId: "shot-script-1",
    segmentCount: 1,
    totalRequiredFrameCount: 2,
    approvedSegmentCount: 0,
    updatedAt: "2024-01-01T00:00:09Z",
  },
};

const imagesGeneratingProject = {
  ...shotScriptApprovedProject,
  status: "images_generating" as const,
  currentImageBatch: {
    id: "image-batch-1",
    sourceShotScriptId: "shot-script-1",
    segmentCount: 1,
    totalRequiredFrameCount: 2,
    approvedSegmentCount: 0,
    updatedAt: "2024-01-01T00:00:09Z",
  },
};

const imagesApprovedSummaryProject = {
  ...shotScriptApprovedProject,
  status: "images_in_review" as const,
  currentImageBatch: {
    id: "image-batch-1",
    sourceShotScriptId: "shot-script-1",
    segmentCount: 2,
    totalRequiredFrameCount: 3,
    approvedSegmentCount: 2,
    updatedAt: "2024-01-01T00:00:09Z",
  },
  currentVideoBatch: null,
};

const videosInReviewProject = {
  ...shotScriptApprovedProject,
  status: "videos_in_review" as const,
  currentImageBatch: {
    id: "image-batch-1",
    sourceShotScriptId: "shot-script-1",
    segmentCount: 1,
    totalRequiredFrameCount: 2,
    approvedSegmentCount: 1,
    updatedAt: "2024-01-01T00:00:09Z",
  },
  currentVideoBatch: {
    id: "video-batch-1",
    sourceImageBatchId: "image-batch-1",
    sourceShotScriptId: "shot-script-1",
    shotCount: 1,
    approvedShotCount: 0,
    updatedAt: "2024-01-01T00:00:10Z",
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

const storyboardReviewWorkspaceWithFailedTask = {
  projectId: "proj-1",
  projectName: "Test Project",
  projectStatus: "storyboard_in_review" as const,
  currentStoryboard: fullStoryboard,
  latestTask: failedTask,
  availableActions: {
    save: true,
    approve: true,
    reject: true,
  },
};

const generatingProject = {
  ...sceneSheetsApprovedProject,
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
    vi.restoreAllMocks();
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
    expect(screen.getByRole("button", { name: "场景" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "分镜" })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "前提工作区" })).toBeInTheDocument();
    expect(screen.getByText("premise/v1.md")).toBeInTheDocument();
  });

  it("shows and saves the project-level video reference strategy in the basic settings area", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);
    const updateProject = vi.spyOn(apiModule.apiClient, "updateProject").mockResolvedValue({
      ...baseProject,
      videoReferenceStrategy: "without_frame_refs",
    });

    renderPage();

    expect(await screen.findByRole("combobox", { name: "视频参考策略" })).toHaveValue("auto");

    fireEvent.change(screen.getByRole("combobox", { name: "视频参考策略" }), {
      target: { value: "without_frame_refs" },
    });

    await waitFor(() => {
      expect(updateProject).toHaveBeenCalledWith("proj-1", {
        videoReferenceStrategy: "without_frame_refs",
      });
    });

    expect(screen.getByRole("combobox", { name: "视频参考策略" })).toHaveValue(
      "without_frame_refs",
    );
  });

  it("resets the project premise after a second confirmation", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const resetProjectPremise = vi
      .spyOn(apiModule.apiClient, "resetProjectPremise")
      .mockResolvedValue({
        ...baseProject,
        premise: {
          ...baseProject.premise,
          text: "A retired courier steals back a star map from a drowned archive.",
          visualStyleText: "胶片颗粒感，潮湿港口，低饱和暖金补光",
        },
      });

    renderPage();

    expect(
      await screen.findByRole("textbox", { name: "Premise 文本" }),
    ).toHaveValue(baseProject.premise.text);

    fireEvent.change(screen.getByRole("textbox", { name: "Premise 文本" }), {
      target: { value: "A retired courier steals back a star map from a drowned archive." },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "画面风格描述" }), {
      target: { value: "胶片颗粒感，潮湿港口，低饱和暖金补光" },
    });
    fireEvent.click(screen.getByRole("button", { name: "重新输入前提并重置项目" }));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(resetProjectPremise).toHaveBeenCalledWith("proj-1", {
        premiseText: "A retired courier steals back a star map from a drowned archive.",
        visualStyleText: "胶片颗粒感，潮湿港口，低饱和暖金补光",
        confirmReset: true,
      });
    });
    expect(screen.getByRole("textbox", { name: "Premise 文本" })).toHaveValue(
      "A retired courier steals back a star map from a drowned archive.",
    );
  });

  it("does not reset the project premise when the user cancels confirmation", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const resetProjectPremise = vi.spyOn(apiModule.apiClient, "resetProjectPremise");

    renderPage();

    expect(
      await screen.findByRole("textbox", { name: "Premise 文本" }),
    ).toHaveValue(baseProject.premise.text);
    fireEvent.click(screen.getByRole("button", { name: "重新输入前提并重置项目" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(resetProjectPremise).not.toHaveBeenCalled();
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

  it("keeps polling the project after master-plot task success until the review data arrives", async () => {
    const intervalCallbacks: Array<() => void> = [];
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      intervalCallbacks.push(callback as () => void);
      return intervalCallbacks.length as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);
    vi.spyOn(global, "clearInterval").mockImplementation(() => undefined);

    vi.spyOn(apiModule.apiClient, "getProjectDetail")
      .mockResolvedValueOnce(baseProject)
      .mockResolvedValueOnce(generatingMasterPlotProject)
      .mockResolvedValueOnce(masterPlotInReviewProject);
    vi.spyOn(apiModule.apiClient, "regenerateMasterPlot").mockResolvedValue(runningMasterPlotTask);
    const getTaskDetail = vi
      .spyOn(apiModule.apiClient, "getTaskDetail")
      .mockResolvedValue(succeededMasterPlotTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "主情节" }));

    const intervalCountBeforeGenerate = intervalCallbacks.length;

    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));

    await waitFor(() => {
      expect(apiModule.apiClient.regenerateMasterPlot).toHaveBeenCalledWith("proj-1");
    });

    let taskPollHandled = false;
    const intervalCountAfterGenerate = intervalCallbacks.length;

    for (let index = intervalCountBeforeGenerate; index < intervalCountAfterGenerate; index += 1) {
      await act(async () => {
        intervalCallbacks[index]?.();
        await flushMicrotasks();
      });

      if (getTaskDetail.mock.calls.length > 0) {
        taskPollHandled = true;
        break;
      }
    }

    expect(taskPollHandled).toBe(true);

    await waitFor(() => {
      expect(apiModule.apiClient.getProjectDetail).toHaveBeenCalledTimes(2);
    });

    expect(screen.queryByRole("link", { name: /进入主情节审核/i })).not.toBeInTheDocument();

    const projectRefreshCallbacks = intervalCallbacks.slice(intervalCountAfterGenerate);
    expect(projectRefreshCallbacks.length).toBeGreaterThan(0);

    for (const callback of projectRefreshCallbacks) {
      await act(async () => {
        callback();
        await flushMicrotasks();
      });
    }

    expect(apiModule.apiClient.getProjectDetail).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("link", { name: /进入主情节审核/i })).toHaveAttribute(
      "href",
      "/projects/proj-1/master-plot/review",
    );
  });

  it("starts master-plot regeneration from the master-plot panel", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);
    const regenerateMasterPlot = vi
      .spyOn(apiModule.apiClient, "regenerateMasterPlot")
      .mockResolvedValue(runningMasterPlotTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "主情节" }));

    expect(screen.getByRole("heading", { name: "主情节工作区" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));

    await waitFor(() => {
      expect(regenerateMasterPlot).toHaveBeenCalledWith("proj-1");
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

    expect(screen.getByRole("button", { name: "场景" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "分镜" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "角色设定" }));

    expect(screen.getByRole("heading", { name: "角色设定工作区" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "重新生成" }).length).toBeGreaterThan(0);
  });

  it("enables the scene panel after character sheets are approved and keeps storyboard disabled", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(
      characterSheetsApprovedProject,
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "场景" })).toBeEnabled();
    });

    expect(screen.getByRole("button", { name: "分镜" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "场景" }));

    expect(screen.getByRole("heading", { name: "场景设定工作区" })).toBeInTheDocument();
  });

  it("enables the storyboard panel after scene sheets are approved", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(sceneSheetsApprovedProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));

    expect(screen.getByRole("heading", { name: "分镜工作区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新生成分镜" })).toBeInTheDocument();
  });

  it("auto-selects storyboard instead of scene sheets once storyboard data exists", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(storyboardApprovedProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    expect(screen.getByRole("heading", { name: "分镜工作区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "场景" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("enables the shot-script panel after storyboard approval", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(storyboardApprovedProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "镜头脚本" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "镜头脚本" }));

    expect(screen.getByRole("heading", { name: "镜头脚本工作区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新生成" })).toBeInTheDocument();
  });

  it("enables the image phase after shot-script approval and loads frame cards", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(imagesInReviewProject);
    vi.spyOn(apiModule.apiClient, "listImages").mockResolvedValue({
      currentBatch: imagesInReviewProject.currentImageBatch,
      shots: [
        {
          id: "shot-ref-1",
          batchId: "image-batch-1",
          projectId: "proj-1",
          sourceShotScriptId: "shot-script-1",
          shotId: "shot-1",
          shotCode: "S01-SG01-SH01",
          frameDependency: "start_and_end_frame" as const,
          referenceStatus: "in_review" as const,
          startFrame: {
            id: "frame-start-1",
            batchId: "image-batch-1",
            projectId: "proj-1",
            sourceShotScriptId: "shot-script-1",
            segmentId: "segment-1",
            sceneId: "scene-1",
            order: 1,
            frameType: "start_frame" as const,
            planStatus: "planned" as const,
            imageStatus: "in_review" as const,
            selectedCharacterIds: ["char-rin"],
            matchedReferenceImagePaths: ["character-sheets/char-rin/current.png"],
            unmatchedCharacterIds: [],
            promptTextSeed: "雨夜市场入口，林站在霓虹雨幕前。",
            promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前。",
            negativePromptTextCurrent: null,
            promptUpdatedAt: "2024-01-01T00:00:09Z",
            imageAssetPath: "images/frame-start-1/current.png",
            imageWidth: 1536,
            imageHeight: 1024,
            provider: "turnaround-image",
            model: "doubao-seedream-5-0-260128",
            approvedAt: null,
            updatedAt: "2024-01-01T00:00:09Z",
            sourceTaskId: "task-frame-start-1",
          },
          endFrame: {
            id: "frame-end-1",
            batchId: "image-batch-1",
            projectId: "proj-1",
            sourceShotScriptId: "shot-script-1",
            segmentId: "segment-1",
            sceneId: "scene-1",
            order: 1,
            frameType: "end_frame" as const,
            planStatus: "planned" as const,
            imageStatus: "in_review" as const,
            selectedCharacterIds: ["char-rin"],
            matchedReferenceImagePaths: ["character-sheets/char-rin/current.png"],
            unmatchedCharacterIds: [],
            promptTextSeed: "尾帧定格在林与天际冷白尾光的对视。",
            promptTextCurrent: "尾帧定格在林与天际冷白尾光的对视。",
            negativePromptTextCurrent: null,
            promptUpdatedAt: "2024-01-01T00:00:09Z",
            imageAssetPath: "images/frame-end-1/current.png",
            imageWidth: 1536,
            imageHeight: 1024,
            provider: "turnaround-image",
            model: "doubao-seedream-5-0-260128",
            approvedAt: null,
            updatedAt: "2024-01-01T00:00:09Z",
            sourceTaskId: "task-frame-end-1",
          },
          updatedAt: "2024-01-01T00:00:09Z",
        },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "画面" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "画面" }));

    await waitFor(() => {
      expect(apiModule.apiClient.listImages).toHaveBeenCalledWith("proj-1");
    });

    expect(screen.getByRole("heading", { name: "画面工作区" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Segment 1/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "起始帧" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "结束帧" })).toBeInTheDocument();
  });

  it("auto-selects the current image phase when the project is already generating images", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(imagesGeneratingProject);
    vi.spyOn(apiModule.apiClient, "listImages").mockResolvedValue({
      currentBatch: imagesGeneratingProject.currentImageBatch,
      shots: [],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "画面" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    expect(screen.getByRole("heading", { name: "画面工作区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新生成" })).toBeEnabled();
  });

  it("enables the videos phase when the current image batch summary is approved by shot count", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(imagesApprovedSummaryProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "视频" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "视频" }));

    expect(screen.getByRole("heading", { name: "视频工作区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始生成视频片段配置" })).toBeInTheDocument();
    expect(
      screen.getByText(/先为每个 Segment 生成可编辑视频配置，确认后再逐片段或整批生成视频/i),
    ).toBeInTheDocument();
  });

  it("auto-selects the videos phase when the project already has a current video batch", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(videosInReviewProject);
    vi.spyOn(apiModule.apiClient, "listVideos").mockResolvedValue({
      currentBatch: videosInReviewProject.currentVideoBatch,
      shots: [
        {
          id: "video-segment-1",
          projectId: "proj-1",
          batchId: "video-batch-1",
          sourceImageBatchId: "image-batch-1",
          sourceShotScriptId: "shot-script-1",
          shotId: "shot-1",
          shotCode: "S01-SG01-SH01",
          sceneId: "scene-1",
          frameDependency: "start_and_end_frame" as const,
          status: "in_review" as const,
          promptTextSeed: "seed video prompt",
          promptTextCurrent: "current video prompt",
          promptUpdatedAt: "2024-01-01T00:00:11Z",
          videoAssetPath: "videos/batches/video-batch-1/segments/segment-1/current.mp4",
          thumbnailAssetPath: "videos/batches/video-batch-1/segments/segment-1/thumbnail.webp",
          durationSec: 6,
          provider: "vector-engine",
          model: "sora-2-all",
          updatedAt: "2024-01-01T00:00:12Z",
          approvedAt: null,
          sourceTaskId: "task-video-segment-1",
        },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "视频" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    expect(screen.getByRole("heading", { name: "视频工作区" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "成片工作区" })).not.toBeInTheDocument();
  });

  it("enables the image phase when the current shot script summary is approved even before project status catches up", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(
      shotScriptApprovedSummaryProject,
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "画面" })).toBeEnabled();
    });
  });

  it("loads project detail and lets the user start storyboard regeneration", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(
      sceneSheetsApprovedProject,
    );
    vi.spyOn(apiModule.apiClient, "regenerateStoryboard").mockResolvedValue(runningTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));
    fireEvent.click(screen.getByRole("button", { name: "重新生成分镜" }));

    await waitFor(() => {
      expect(apiModule.apiClient.regenerateStoryboard).toHaveBeenCalledWith("proj-1");
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

  it("loads the latest storyboard task status after refreshing the project detail page", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(reviewedProject);
    vi.spyOn(apiModule.apiClient, "getCurrentStoryboard").mockResolvedValue(fullStoryboard);
    const getStoryboardReviewWorkspace = vi
      .spyOn(apiModule.apiClient, "getStoryboardReviewWorkspace")
      .mockResolvedValue(storyboardReviewWorkspaceWithFailedTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));

    await waitFor(() => {
      expect(getStoryboardReviewWorkspace).toHaveBeenCalledWith("proj-1");
    });

    expect(screen.getByRole("heading", { name: "任务状态" })).toBeInTheDocument();
    expect(screen.getByText("失败")).toBeInTheDocument();
    expect(screen.getByText("Provider rate limit")).toBeInTheDocument();
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

  it("starts shot-script regeneration from the shot-script panel", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(storyboardApprovedProject);
    vi.spyOn(apiModule.apiClient, "regenerateShotScript").mockResolvedValue(runningShotScriptTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "镜头脚本" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "镜头脚本" }));
    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));

    await waitFor(() => {
      expect(apiModule.apiClient.regenerateShotScript).toHaveBeenCalledWith("proj-1");
    });

    expect(screen.getByRole("heading", { name: "任务状态" })).toBeInTheDocument();
    expect(screen.getByText("执行中")).toBeInTheDocument();
  });

  it("keeps the top shot-script regenerate button enabled after the project has moved past storyboard approval", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(shotScriptApprovedProject);
    vi.spyOn(apiModule.apiClient, "getCurrentShotScript").mockResolvedValue(fullShotScript);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "镜头脚本" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "镜头脚本" }));

    const regenerateButton = await screen.findByRole("button", { name: "重新生成" });
    expect(regenerateButton).toBeEnabled();
  });

  it("allows top-level shot-script regenerate while the stage is generating after confirmation", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(generatingShotScriptProject);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const regenerateShotScript = vi
      .spyOn(apiModule.apiClient, "regenerateShotScript")
      .mockResolvedValue(runningShotScriptTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "镜头脚本" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "镜头脚本" }));

    const regenerateButton = await screen.findByRole("button", { name: "重新生成" });
    expect(regenerateButton).toBeEnabled();

    fireEvent.click(regenerateButton);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(regenerateShotScript).toHaveBeenCalledWith("proj-1");
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

  it("keeps the current project detail visible during background refresh polling", async () => {
    let refreshTimer: (() => void) | undefined;
    let resolveRefresh: ((value: typeof reviewedProject) => void) | undefined;
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      refreshTimer = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);

    vi.spyOn(apiModule.apiClient, "getProjectDetail")
      .mockResolvedValueOnce(generatingProject)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));
    expect(screen.getByRole("heading", { name: "分镜工作区" })).toBeInTheDocument();
    expect(screen.getByText(/分镜文案生成中/)).toBeInTheDocument();

    await act(async () => {
      refreshTimer?.();
      await flushMicrotasks();
    });

    expect(screen.getByRole("heading", { name: "分镜工作区" })).toBeInTheDocument();
    expect(screen.getByText(/分镜文案生成中/)).toBeInTheDocument();
    expect(screen.queryByText("加载中...")).not.toBeInTheDocument();

    await act(async () => {
      resolveRefresh?.(reviewedProject);
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
      .mockResolvedValueOnce(sceneSheetsApprovedProject)
      .mockResolvedValueOnce(reviewedProject);
    vi.spyOn(apiModule.apiClient, "regenerateStoryboard").mockResolvedValue(runningTask);
    const getTaskDetail = vi
      .spyOn(apiModule.apiClient, "getTaskDetail")
      .mockResolvedValueOnce(runningTask)
      .mockResolvedValueOnce(succeededTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));
    fireEvent.click(screen.getByRole("button", { name: "重新生成分镜" }));

    await waitFor(() => {
      expect(apiModule.apiClient.regenerateStoryboard).toHaveBeenCalledWith("proj-1");
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
      sceneSheetsApprovedProject,
    );
    vi.spyOn(apiModule.apiClient, "regenerateStoryboard").mockResolvedValue(runningTask);
    const getTaskDetail = vi
      .spyOn(apiModule.apiClient, "getTaskDetail")
      .mockResolvedValue(failedTask);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "分镜" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "分镜" }));
    fireEvent.click(screen.getByRole("button", { name: "重新生成分镜" }));

    await waitFor(() => {
      expect(apiModule.apiClient.regenerateStoryboard).toHaveBeenCalledWith("proj-1");
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

    expect(screen.getByRole("button", { name: "场景" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "分镜" })).toBeDisabled();
  });

  it("loads the scene phase when scene sheets are in review and keeps storyboard locked", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(sceneSheetsInReviewProject);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "场景" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "场景" }));

    expect(screen.getByRole("heading", { name: "场景设定工作区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "分镜" })).toBeDisabled();
  });

  it("shows a generate button in the scene phase after character sheets are approved", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(
      characterSheetsApprovedProject,
    );
    vi.spyOn(apiModule.apiClient, "createSceneSheetsGenerateTask").mockResolvedValue({
      id: "task-scene-batch-1",
      projectId: "proj-1",
      type: "scene_sheets_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-scene-batch-1/input.json",
        outputPath: "tasks/task-scene-batch-1/output.json",
        logPath: "tasks/task-scene-batch-1/log.txt",
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "场景" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "场景" }));

    const generateButton = await screen.findByRole("button", { name: "生成场景设定" });
    expect(generateButton).toBeEnabled();

    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(apiModule.apiClient.createSceneSheetsGenerateTask).toHaveBeenCalledWith("proj-1");
    });
  });

  it("keeps the scene generate button enabled after the project has already entered scene-sheet review", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(sceneSheetsInReviewProject);
    vi.spyOn(apiModule.apiClient, "listSceneSheets").mockResolvedValue({
      currentBatch: sceneSheetsInReviewProject.currentSceneSheetBatch,
      scenes: [
        {
          id: "scene-1",
          projectId: "proj-1",
          batchId: "scene-batch-1",
          sourceMasterPlotId: "mp-1",
          sourceCharacterSheetBatchId: "char-batch-1",
          sceneName: "Rain Dock",
          scenePurpose: "Establish the main dock environment.",
          constraintsText: "Wet reflective dock, blue neon, storm wind",
          promptTextGenerated: "anime dock at rainstorm night",
          promptTextCurrent: "anime dock at rainstorm night",
          imageAssetPath: "scene-sheets/scene-1/current.png",
          imageWidth: 1536,
          imageHeight: 1024,
          provider: "seedance",
          model: "seedance-scene",
          status: "in_review" as const,
          updatedAt: "2024-01-01T00:00:06Z",
          approvedAt: null,
          sourceTaskId: "task-scene-1",
        },
      ],
    });
    vi.spyOn(apiModule.apiClient, "createSceneSheetsGenerateTask").mockResolvedValue({
      id: "task-scene-batch-2",
      projectId: "proj-1",
      type: "scene_sheets_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-scene-batch-2/input.json",
        outputPath: "tasks/task-scene-batch-2/output.json",
        logPath: "tasks/task-scene-batch-2/log.txt",
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "场景" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "场景" }));

    const generateButton = await screen.findByRole("button", { name: "生成场景设定" });
    expect(generateButton).toBeEnabled();

    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(apiModule.apiClient.createSceneSheetsGenerateTask).toHaveBeenCalledWith("proj-1");
    });
  });

  it("lets the user edit, regenerate, and approve a scene sheet from the project detail page", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(sceneSheetsInReviewProject);
    vi.spyOn(apiModule.apiClient, "listSceneSheets").mockResolvedValue({
      currentBatch: sceneSheetsInReviewProject.currentSceneSheetBatch,
      scenes: [
        {
          id: "scene-1",
          projectId: "proj-1",
          batchId: "scene-batch-1",
          sourceMasterPlotId: "mp-1",
          sourceCharacterSheetBatchId: "char-batch-1",
          sceneName: "暴雨码头",
          scenePurpose: "开场的外部环境锚点。",
          constraintsText: "保持码头结构、远处吊机轮廓、暴雨夜氛围。",
          promptTextGenerated: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
          promptTextCurrent: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
          imageAssetPath: "scene-sheets/scene-1/current.png",
          imageWidth: 1536,
          imageHeight: 1024,
          provider: "seedance",
          model: "seedance-scene",
          status: "in_review" as const,
          updatedAt: "2024-01-01T00:00:06Z",
          approvedAt: null,
          sourceTaskId: "task-scene-1",
        },
        {
          id: "scene-2",
          projectId: "proj-1",
          batchId: "scene-batch-1",
          sourceMasterPlotId: "mp-1",
          sourceCharacterSheetBatchId: "char-batch-1",
          sceneName: "诊所走廊",
          scenePurpose: "揭示段的重要室内环境。",
          constraintsText: "保持窄走廊、冷白顶灯、旧门牌与夜间空旷感。",
          promptTextGenerated: "老旧私人诊所走廊，夜晚冷白顶灯，空旷安静。",
          promptTextCurrent: "老旧私人诊所走廊，夜晚冷白顶灯，空旷安静。",
          imageAssetPath: "scene-sheets/scene-2/current.png",
          imageWidth: 1536,
          imageHeight: 1024,
          provider: "seedance",
          model: "seedance-scene",
          status: "approved" as const,
          updatedAt: "2024-01-01T00:00:06Z",
          approvedAt: "2024-01-01T00:00:07Z",
          sourceTaskId: "task-scene-2",
        },
      ],
    });
    vi.spyOn(apiModule.apiClient, "updateSceneSheetPrompt").mockResolvedValue({
      id: "scene-1",
      projectId: "proj-1",
      batchId: "scene-batch-1",
      sourceMasterPlotId: "mp-1",
      sourceCharacterSheetBatchId: "char-batch-1",
      sceneName: "暴雨码头",
      scenePurpose: "开场的外部环境锚点。",
      constraintsText: "保持码头结构、远处吊机轮廓、暴雨夜氛围。",
      promptTextGenerated: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
      promptTextCurrent: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影，湿滑地面积水。",
      imageAssetPath: "scene-sheets/scene-1/current.png",
      imageWidth: 1536,
      imageHeight: 1024,
      provider: "seedance",
      model: "seedance-scene",
      status: "in_review",
      updatedAt: "2024-01-01T00:00:08Z",
      approvedAt: null,
      sourceTaskId: "task-scene-1",
    });
    vi.spyOn(apiModule.apiClient, "regenerateSceneSheet").mockResolvedValue({
      id: "task-scene-1-regen",
      projectId: "proj-1",
      type: "scene_sheet_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:07Z",
      updatedAt: "2024-01-01T00:00:07Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-scene-1-regen/input.json",
        outputPath: "tasks/task-scene-1-regen/output.json",
        logPath: "tasks/task-scene-1-regen/log.txt",
      },
    });
    vi.spyOn(apiModule.apiClient, "approveSceneSheet").mockResolvedValue({
      id: "scene-1",
      projectId: "proj-1",
      batchId: "scene-batch-1",
      sourceMasterPlotId: "mp-1",
      sourceCharacterSheetBatchId: "char-batch-1",
      sceneName: "暴雨码头",
      scenePurpose: "开场的外部环境锚点。",
      constraintsText: "保持码头结构、远处吊机轮廓、暴雨夜氛围。",
      promptTextGenerated: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
      promptTextCurrent: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影，湿滑地面积水。",
      imageAssetPath: "scene-sheets/scene-1/current.png",
      imageWidth: 1536,
      imageHeight: 1024,
      provider: "seedance",
      model: "seedance-scene",
      status: "approved",
      updatedAt: "2024-01-01T00:00:09Z",
      approvedAt: "2024-01-01T00:00:09Z",
      sourceTaskId: "task-scene-1-regen",
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "场景" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "场景" }));

    await waitFor(() => {
      expect(screen.getByText("暴雨码头")).toBeInTheDocument();
      expect(screen.getByText("诊所走廊")).toBeInTheDocument();
    });

    fireEvent.change(screen.getAllByRole("textbox", { name: "场景提示词" })[0]!, {
      target: { value: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影，湿滑地面积水。" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "保存提示词" })[0]!);

    await waitFor(() => {
      expect(apiModule.apiClient.updateSceneSheetPrompt).toHaveBeenCalledWith("proj-1", "scene-1", {
        promptTextCurrent: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影，湿滑地面积水。",
      });
    });

    fireEvent.click(screen.getAllByRole("button", { name: "重新生成当前场景" })[0]!);

    await waitFor(() => {
      expect(apiModule.apiClient.regenerateSceneSheet).toHaveBeenCalledWith("proj-1", "scene-1");
    });

    fireEvent.click(screen.getAllByRole("button", { name: "通过当前场景" })[0]!);

    await waitFor(() => {
      expect(apiModule.apiClient.approveSceneSheet).toHaveBeenCalledWith("proj-1", "scene-1");
    });
  });

  it("saves the current scene prompt before regenerating from the project detail page", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(sceneSheetsInReviewProject);
    vi.spyOn(apiModule.apiClient, "listSceneSheets").mockResolvedValue({
      currentBatch: sceneSheetsInReviewProject.currentSceneSheetBatch,
      scenes: [
        {
          id: "scene-1",
          projectId: "proj-1",
          batchId: "scene-batch-1",
          sourceMasterPlotId: "mp-1",
          sourceCharacterSheetBatchId: "char-batch-1",
          sceneName: "暴雨码头",
          scenePurpose: "开场的外部环境锚点。",
          constraintsText: "保持码头结构、远处吊机轮廓、暴雨夜氛围。",
          promptTextGenerated: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
          promptTextCurrent: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
          imageAssetPath: "scene-sheets/scene-1/current.png",
          imageWidth: 1536,
          imageHeight: 1024,
          provider: "seedance",
          model: "seedance-scene",
          status: "in_review" as const,
          updatedAt: "2024-01-01T00:00:06Z",
          approvedAt: null,
          sourceTaskId: "task-scene-1",
        },
      ],
    });
    vi.spyOn(apiModule.apiClient, "updateSceneSheetPrompt").mockResolvedValue({
      id: "scene-1",
      projectId: "proj-1",
      batchId: "scene-batch-1",
      sourceMasterPlotId: "mp-1",
      sourceCharacterSheetBatchId: "char-batch-1",
      sceneName: "暴雨码头",
      scenePurpose: "开场的外部环境锚点。",
      constraintsText: "保持码头结构、远处吊机轮廓、暴雨夜氛围。",
      promptTextGenerated: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
      promptTextCurrent: "废旧集装箱码头，暴雨夜，积水映出冷蓝霓虹，远处吊机沉在雨幕里。",
      imageAssetPath: "scene-sheets/scene-1/current.png",
      imageWidth: 1536,
      imageHeight: 1024,
      provider: "seedance",
      model: "seedance-scene",
      status: "in_review",
      updatedAt: "2024-01-01T00:00:08Z",
      approvedAt: null,
      sourceTaskId: "task-scene-1",
    });
    vi.spyOn(apiModule.apiClient, "regenerateSceneSheet").mockResolvedValue({
      id: "task-scene-1-regen",
      projectId: "proj-1",
      type: "scene_sheet_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:07Z",
      updatedAt: "2024-01-01T00:00:07Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-scene-1-regen/input.json",
        outputPath: "tasks/task-scene-1-regen/output.json",
        logPath: "tasks/task-scene-1-regen/log.txt",
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "场景" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "场景" }));

    await waitFor(() => {
      expect(screen.getByText("暴雨码头")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("textbox", { name: "场景提示词" }), {
      target: { value: "废旧集装箱码头，暴雨夜，积水映出冷蓝霓虹，远处吊机沉在雨幕里。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "重新生成当前场景" }));

    await waitFor(() => {
      expect(apiModule.apiClient.updateSceneSheetPrompt).toHaveBeenCalledWith("proj-1", "scene-1", {
        promptTextCurrent: "废旧集装箱码头，暴雨夜，积水映出冷蓝霓虹，远处吊机沉在雨幕里。",
      });
    });
    await waitFor(() => {
      expect(apiModule.apiClient.regenerateSceneSheet).toHaveBeenCalledWith("proj-1", "scene-1");
    });
  });

  it("shows scene placeholders when image assets are not ready yet", async () => {
    vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(sceneSheetsInReviewProject);
    vi.spyOn(apiModule.apiClient, "listSceneSheets").mockResolvedValue({
      currentBatch: sceneSheetsInReviewProject.currentSceneSheetBatch,
      scenes: [
        {
          id: "scene-1",
          projectId: "proj-1",
          batchId: "scene-batch-1",
          sourceMasterPlotId: "mp-1",
          sourceCharacterSheetBatchId: "char-batch-1",
          sceneName: "暴雨码头",
          scenePurpose: "开场的外部环境锚点。",
          constraintsText: "保持码头结构、远处吊机轮廓、暴雨夜氛围。",
          promptTextGenerated: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
          promptTextCurrent: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
          imageAssetPath: null,
          imageWidth: null,
          imageHeight: null,
          provider: null,
          model: null,
          status: "generating" as const,
          updatedAt: "2024-01-01T00:00:06Z",
          approvedAt: null,
          sourceTaskId: "task-scene-1",
        },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "场景" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "场景" }));

    await waitFor(() => {
      expect(screen.getByText("暴雨码头")).toBeInTheDocument();
    });

    expect(screen.getByText("场景图生成中")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成场景设定" })).toBeEnabled();
  });
});
