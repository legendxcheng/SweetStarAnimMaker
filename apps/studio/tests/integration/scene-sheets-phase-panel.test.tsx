import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SceneSheetsPhasePanel } from "../../src/components/scene-sheets-phase-panel";
import * as apiModule from "../../src/services/api-client";

vi.mock("../../src/services/api-client");

const baseProject = {
  id: "proj-1",
  name: "Test Project",
  slug: "test-project",
  status: "scene_sheets_in_review" as const,
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
  currentCharacterSheetBatch: {
    id: "char-batch-1",
    sourceMasterPlotId: "mp-1",
    characterCount: 2,
    approvedCharacterCount: 2,
    updatedAt: "2024-01-01T00:00:05Z",
  },
  currentSceneSheetBatch: {
    id: "scene-batch-1",
    sourceMasterPlotId: "mp-1",
    sourceCharacterSheetBatchId: "char-batch-1",
    sceneCount: 2,
    approvedSceneCount: 1,
    updatedAt: "2024-01-01T00:00:06Z",
  },
  currentStoryboard: null,
  currentShotScript: null,
  currentImageBatch: null,
  currentVideoBatch: null,
};

const rainDockScene = {
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
};

const clinicScene = {
  ...rainDockScene,
  id: "scene-2",
  sceneName: "诊所走廊",
  scenePurpose: "揭示段的重要室内环境。",
  constraintsText: "保持窄走廊、冷白顶灯、旧门牌与夜间空旷感。",
  promptTextGenerated: "老旧私人诊所走廊，夜晚冷白顶灯，空旷安静。",
  promptTextCurrent: "老旧私人诊所走廊，夜晚冷白顶灯，空旷安静。",
  imageAssetPath: "scene-sheets/scene-2/current.png",
  status: "approved" as const,
  approvedAt: "2024-01-01T00:00:07Z",
  sourceTaskId: "task-scene-2",
};

describe("SceneSheetsPhasePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads multiple scenes and lets the user edit, regenerate, and approve one scene", async () => {
    const refreshProject = vi.fn();
    vi.spyOn(apiModule.apiClient, "listSceneSheets").mockResolvedValue({
      currentBatch: baseProject.currentSceneSheetBatch,
      scenes: [rainDockScene, clinicScene],
    });
    vi.spyOn(apiModule.apiClient, "updateSceneSheetPrompt").mockResolvedValue({
      ...rainDockScene,
      promptTextCurrent: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影，湿滑地面积水。",
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
      ...rainDockScene,
      status: "approved",
      approvedAt: "2024-01-01T00:00:08Z",
    });

    render(
      <SceneSheetsPhasePanel
        project={baseProject}
        task={null}
        taskError={null}
        creatingTask={false}
        disableGenerate={false}
        onGenerate={vi.fn()}
        onProjectRefresh={refreshProject}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("暴雨码头")).toBeInTheDocument();
      expect(screen.getByText("诊所走廊")).toBeInTheDocument();
    });

    const promptInputs = screen.getAllByRole("textbox", { name: "场景提示词" });
    fireEvent.change(promptInputs[0]!, {
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
    expect(refreshProject).toHaveBeenCalled();
  });

  it("persists the edited prompt before regenerating when the draft has not been saved yet", async () => {
    const refreshProject = vi.fn();
    vi.spyOn(apiModule.apiClient, "listSceneSheets").mockResolvedValue({
      currentBatch: baseProject.currentSceneSheetBatch,
      scenes: [rainDockScene, clinicScene],
    });
    vi.spyOn(apiModule.apiClient, "updateSceneSheetPrompt").mockResolvedValue({
      ...rainDockScene,
      promptTextCurrent: "废旧集装箱码头，暴雨夜，积水映出冷蓝霓虹，远处吊机沉在雨幕里。",
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

    render(
      <SceneSheetsPhasePanel
        project={baseProject}
        task={null}
        taskError={null}
        creatingTask={false}
        disableGenerate={false}
        onGenerate={vi.fn()}
        onProjectRefresh={refreshProject}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("暴雨码头")).toBeInTheDocument();
    });

    fireEvent.change(screen.getAllByRole("textbox", { name: "场景提示词" })[0]!, {
      target: { value: "废旧集装箱码头，暴雨夜，积水映出冷蓝霓虹，远处吊机沉在雨幕里。" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "重新生成当前场景" })[0]!);

    await waitFor(() => {
      expect(apiModule.apiClient.updateSceneSheetPrompt).toHaveBeenCalledWith("proj-1", "scene-1", {
        promptTextCurrent: "废旧集装箱码头，暴雨夜，积水映出冷蓝霓虹，远处吊机沉在雨幕里。",
      });
    });
    await waitFor(() => {
      expect(apiModule.apiClient.regenerateSceneSheet).toHaveBeenCalledWith("proj-1", "scene-1");
    });
    expect(refreshProject).toHaveBeenCalled();
  });

  it("shows placeholders when a scene image is still generating or the current image cannot be loaded", async () => {
    vi.spyOn(apiModule.apiClient, "listSceneSheets").mockResolvedValue({
      currentBatch: baseProject.currentSceneSheetBatch,
      scenes: [
        {
          ...rainDockScene,
          id: "scene-generating",
          sceneName: "天台温室",
          imageAssetPath: null,
          status: "generating" as const,
        },
        clinicScene,
      ],
    });

    render(
      <SceneSheetsPhasePanel
        project={baseProject}
        task={null}
        taskError={null}
        creatingTask={false}
        disableGenerate={false}
        onGenerate={vi.fn()}
        onProjectRefresh={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("天台温室")).toBeInTheDocument();
    });

    expect(screen.getByText("场景图生成中")).toBeInTheDocument();

    const loadedImage = screen.getByRole("img", { name: "诊所走廊" });
    fireEvent.error(loadedImage);

    await waitFor(() => {
      expect(screen.getAllByText("暂无场景图").length).toBeGreaterThan(0);
    });
  });
});
