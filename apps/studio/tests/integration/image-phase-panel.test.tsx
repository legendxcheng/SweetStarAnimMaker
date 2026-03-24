import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImagePhasePanel } from "../../src/components/image-phase-panel";
import * as apiModule from "../../src/services/api-client";

vi.mock("../../src/services/api-client");

const baseProject = {
  id: "proj-1",
  name: "Test Project",
  slug: "test-project",
  status: "images_in_review" as const,
  storageDir: "/path/to/project",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  premise: {
    path: "premise/v1.md",
    bytes: 42,
    updatedAt: "2024-01-01T00:00:00Z",
  },
  currentMasterPlot: null,
  currentCharacterSheetBatch: null,
  currentStoryboard: null,
  currentShotScript: {
    id: "shot-script-1",
    title: "Episode 1 Shot Script",
    sourceStoryboardId: "storyboard-1",
    sourceTaskId: "task-shot-script-1",
    updatedAt: "2024-01-01T00:00:07Z",
    approvedAt: "2024-01-01T00:00:08Z",
    segmentCount: 1,
    shotCount: 3,
    totalDurationSec: 18,
  },
  currentImageBatch: {
    id: "image-batch-1",
    sourceShotScriptId: "shot-script-1",
    segmentCount: 1,
    totalFrameCount: 2,
    approvedFrameCount: 0,
    updatedAt: "2024-01-01T00:00:09Z",
  },
};

const imageListResponse = {
  currentBatch: baseProject.currentImageBatch,
  frames: [
    {
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
      unmatchedCharacterIds: ["char-ivo"],
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
    {
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
      negativePromptTextCurrent: "低清晰度",
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
  ],
};

function renderPanel() {
  return render(
    <ImagePhasePanel
      project={baseProject}
      task={null}
      taskError={null}
      creatingTask={false}
      disableGenerate={false}
      onGenerate={vi.fn()}
      onProjectRefresh={vi.fn()}
    />,
  );
}

describe("ImagePhasePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders one segment card with independent start and end frame panels", async () => {
    vi.spyOn(apiModule.apiClient, "listImages").mockResolvedValue(imageListResponse);

    renderPanel();

    await waitFor(() => {
      expect(apiModule.apiClient.listImages).toHaveBeenCalledWith("proj-1");
    });

    expect(screen.getByText("Segment 1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "起始帧" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "结束帧" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("雨夜市场入口，林站在霓虹雨幕前。")).toBeInTheDocument();
    expect(screen.getByDisplayValue("尾帧定格在林与天际冷白尾光的对视。")).toBeInTheDocument();
    expect(screen.getByText(/未匹配角色/i)).toBeInTheDocument();
    expect(screen.getAllByText("character-sheets/char-rin/current.png")[0]).toBeInTheDocument();
  });

  it("saves prompt edits, regenerates prompt, generates image, and approves one frame", async () => {
    const refreshProject = vi.fn();
    vi.spyOn(apiModule.apiClient, "listImages").mockResolvedValue(imageListResponse);
    vi.spyOn(apiModule.apiClient, "updateImageFramePrompt").mockResolvedValue({
      ...imageListResponse.frames[0],
      promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前，镜头更贴近人物表情。",
      negativePromptTextCurrent: "低清晰度、重复人物",
    });
    vi.spyOn(apiModule.apiClient, "regenerateImageFramePrompt").mockResolvedValue({
      id: "task-frame-prompt-1",
      projectId: "proj-1",
      type: "frame_prompt_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:09Z",
      updatedAt: "2024-01-01T00:00:09Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-frame-prompt-1/input.json",
        outputPath: "tasks/task-frame-prompt-1/output.json",
        logPath: "tasks/task-frame-prompt-1/log.txt",
      },
    });
    vi.spyOn(apiModule.apiClient, "generateImageFrame").mockResolvedValue({
      id: "task-frame-image-1",
      projectId: "proj-1",
      type: "frame_image_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:10Z",
      updatedAt: "2024-01-01T00:00:10Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-frame-image-1/input.json",
        outputPath: "tasks/task-frame-image-1/output.json",
        logPath: "tasks/task-frame-image-1/log.txt",
      },
    });
    vi.spyOn(apiModule.apiClient, "approveImageFrame").mockResolvedValue({
      ...imageListResponse.frames[0],
      imageStatus: "approved",
      approvedAt: "2024-01-01T00:00:11Z",
    });

    render(
      <ImagePhasePanel
        project={baseProject}
        task={null}
        taskError={null}
        creatingTask={false}
        disableGenerate={false}
        onGenerate={vi.fn()}
        onProjectRefresh={refreshProject}
      />,
    );

    const promptInput = await screen.findByDisplayValue("雨夜市场入口，林站在霓虹雨幕前。");
    fireEvent.change(promptInput, {
      target: { value: "雨夜市场入口，林站在霓虹雨幕前，镜头更贴近人物表情。" },
    });
    fireEvent.change(screen.getByLabelText("起始帧负面提示词"), {
      target: { value: "低清晰度、重复人物" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存起始帧提示词" }));

    await waitFor(() => {
      expect(apiModule.apiClient.updateImageFramePrompt).toHaveBeenCalledWith(
        "proj-1",
        "frame-start-1",
        {
          promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前，镜头更贴近人物表情。",
          negativePromptTextCurrent: "低清晰度、重复人物",
        },
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "重新生成起始帧 Prompt" }));
    await waitFor(() => {
      expect(apiModule.apiClient.regenerateImageFramePrompt).toHaveBeenCalledWith(
        "proj-1",
        "frame-start-1",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "生成起始帧图片" }));
    await waitFor(() => {
      expect(apiModule.apiClient.generateImageFrame).toHaveBeenCalledWith(
        "proj-1",
        "frame-start-1",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "审核通过起始帧" }));
    await waitFor(() => {
      expect(apiModule.apiClient.approveImageFrame).toHaveBeenCalledWith(
        "proj-1",
        "frame-start-1",
      );
    });
    expect(refreshProject).toHaveBeenCalled();
  });
});
