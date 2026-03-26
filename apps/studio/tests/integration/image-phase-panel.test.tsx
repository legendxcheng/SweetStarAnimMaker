import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("renders scene tabs and shows only the active scene's segments", async () => {
    vi.spyOn(apiModule.apiClient, "listImages").mockResolvedValue({
      currentBatch: {
        ...baseProject.currentImageBatch,
        segmentCount: 2,
        totalFrameCount: 4,
      },
      frames: [
        {
          ...imageListResponse.frames[0],
          id: "frame-scene-1-start",
          sceneId: "scene-1",
          segmentId: "segment-1",
          order: 1,
          promptTextCurrent: "scene 1 start",
          promptTextSeed: "scene 1 start",
        },
        {
          ...imageListResponse.frames[1],
          id: "frame-scene-1-end",
          sceneId: "scene-1",
          segmentId: "segment-1",
          order: 1,
          promptTextCurrent: "scene 1 end",
          promptTextSeed: "scene 1 end",
        },
        {
          ...imageListResponse.frames[0],
          id: "frame-scene-2-start",
          sceneId: "scene-2",
          segmentId: "segment-1",
          order: 1,
          promptTextCurrent: "scene 2 start",
          promptTextSeed: "scene 2 start",
        },
        {
          ...imageListResponse.frames[1],
          id: "frame-scene-2-end",
          sceneId: "scene-2",
          segmentId: "segment-1",
          order: 1,
          promptTextCurrent: "scene 2 end",
          promptTextSeed: "scene 2 end",
        },
      ],
    });

    renderPanel();

    await waitFor(() => {
      expect(apiModule.apiClient.listImages).toHaveBeenCalledWith("proj-1");
    });

    // Tab 栏应出现两个 Scene 按钮
    const nav = screen.getByRole("navigation", { name: "Scene 导航" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /scene-1/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /scene-2/ })).toBeInTheDocument();

    // 默认选中第一个 Scene，只显示 scene-1 的内容
    expect(screen.getByText("scene-1 / segment-1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("scene 1 start")).toBeInTheDocument();
    expect(screen.queryByText("scene-2 / segment-1")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("scene 2 start")).not.toBeInTheDocument();

    // 点击 scene-2 Tab 切换
    fireEvent.click(screen.getByRole("button", { name: /scene-2/ }));

    expect(screen.getByText("scene-2 / segment-1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("scene 2 start")).toBeInTheDocument();
    expect(screen.queryByText("scene-1 / segment-1")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("scene 1 start")).not.toBeInTheDocument();
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
    vi.spyOn(apiModule.apiClient, "regenerateAllImagePrompts").mockResolvedValue({
      batchId: "image-batch-1",
      frameCount: 2,
      taskIds: ["task-frame-prompt-1", "task-frame-prompt-2"],
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
    expect(refreshProject).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(apiModule.apiClient.listImages).toHaveBeenCalledTimes(3);
    });

    fireEvent.click(screen.getByRole("button", { name: "审核通过起始帧" }));
    await waitFor(() => {
      expect(apiModule.apiClient.approveImageFrame).toHaveBeenCalledWith(
        "proj-1",
        "frame-start-1",
      );
    });
    expect(refreshProject).toHaveBeenCalledTimes(2);
  });

  it("submits a batch prompt regeneration request and disables prompt actions while pending", async () => {
    let resolveBatchRequest: (() => void) | undefined;

    vi.spyOn(apiModule.apiClient, "listImages")
      .mockResolvedValueOnce(imageListResponse)
      .mockResolvedValueOnce({
        ...imageListResponse,
        frames: imageListResponse.frames.map((frame) => ({
          ...frame,
          planStatus: "pending" as const,
        })),
      });
    vi.spyOn(apiModule.apiClient, "regenerateAllImagePrompts").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBatchRequest = () =>
            resolve({
              batchId: "image-batch-1",
              frameCount: 2,
              taskIds: ["task-a", "task-b"],
            });
        }),
    );

    renderPanel();

    const batchButton = await screen.findByRole("button", {
      name: "重新生成当前批次全部 Prompt",
    });
    const singleFrameButton = screen.getByRole("button", { name: "重新生成起始帧 Prompt" });

    fireEvent.click(batchButton);

    await waitFor(() => {
      expect(apiModule.apiClient.regenerateAllImagePrompts).toHaveBeenCalledWith("proj-1");
    });

    expect(batchButton).toBeDisabled();
    expect(singleFrameButton).toBeDisabled();

    resolveBatchRequest?.();

    await waitFor(() => {
      expect(apiModule.apiClient.listImages).toHaveBeenCalledTimes(2);
    });
    expect(
      screen
        .getAllByText(/Prompt 状态：/)
        .some((node) => node.textContent?.includes("Prompt 生成中")),
    ).toBe(true);
  });

  it("submits batch frame regeneration requests and disables image actions while pending", async () => {
    const refreshProject = vi.fn();
    let resolveFirstFrame: (() => void) | undefined;
    let resolveSecondFrame: (() => void) | undefined;

    vi.spyOn(apiModule.apiClient, "listImages")
      .mockResolvedValueOnce(imageListResponse)
      .mockResolvedValueOnce({
        ...imageListResponse,
        frames: imageListResponse.frames.map((frame) => ({
          ...frame,
          imageStatus: "generating" as const,
        })),
      });
    vi.spyOn(apiModule.apiClient, "generateImageFrame")
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstFrame = () =>
              resolve({
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
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondFrame = () =>
              resolve({
                id: "task-frame-image-2",
                projectId: "proj-1",
                type: "frame_image_generate",
                status: "pending",
                createdAt: "2024-01-01T00:00:11Z",
                updatedAt: "2024-01-01T00:00:11Z",
                startedAt: null,
                finishedAt: null,
                errorMessage: null,
                files: {
                  inputPath: "tasks/task-frame-image-2/input.json",
                  outputPath: "tasks/task-frame-image-2/output.json",
                  logPath: "tasks/task-frame-image-2/log.txt",
                },
              });
          }),
      );

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

    const batchButton = await screen.findByRole("button", {
      name: "重新生成当前批次全部帧",
    });
    const singleFrameButton = screen.getByRole("button", { name: "生成起始帧图片" });

    fireEvent.click(batchButton);

    await waitFor(() => {
      expect(apiModule.apiClient.generateImageFrame).toHaveBeenNthCalledWith(
        1,
        "proj-1",
        "frame-start-1",
      );
    });

    expect(batchButton).toBeDisabled();
    expect(singleFrameButton).toBeDisabled();

    await act(async () => {
      resolveFirstFrame?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(apiModule.apiClient.generateImageFrame).toHaveBeenNthCalledWith(
        2,
        "proj-1",
        "frame-end-1",
      );
    });

    expect(batchButton).toBeDisabled();
    expect(singleFrameButton).toBeDisabled();

    await act(async () => {
      resolveSecondFrame?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(refreshProject).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(apiModule.apiClient.listImages).toHaveBeenCalledTimes(2);
    });
  });

  it("renders the batch frame regenerate button in the top action area", async () => {
    vi.spyOn(apiModule.apiClient, "listImages").mockResolvedValue(imageListResponse);

    renderPanel();

    const batchFrameButton = await screen.findByRole("button", {
      name: "重新生成当前批次全部帧",
    });
    const batchPromptButton = screen.getByRole("button", {
      name: "重新生成当前批次全部 Prompt",
    });
    const segmentHeading = screen.getByRole("heading", { name: "Segment 1" });

    expect(
      batchFrameButton.compareDocumentPosition(segmentHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      batchPromptButton.compareDocumentPosition(batchFrameButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("polls pending frame prompts and keeps image generation disabled until prompts are ready", async () => {
    let refreshTimer: (() => void) | undefined;
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      refreshTimer = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);

    vi.spyOn(apiModule.apiClient, "listImages")
      .mockResolvedValueOnce({
        currentBatch: imageListResponse.currentBatch,
        frames: imageListResponse.frames.map((frame) => ({
          ...frame,
          planStatus: "pending" as const,
          imageStatus: "pending" as const,
          promptTextSeed: "",
          promptTextCurrent: "",
          imageAssetPath: null,
          imageWidth: null,
          imageHeight: null,
          provider: null,
          model: null,
          sourceTaskId: "task-frame-prompt-pending",
        })),
      })
      .mockResolvedValueOnce(imageListResponse);

    renderPanel();

    await waitFor(() => {
      expect(apiModule.apiClient.listImages).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("button", { name: "生成起始帧图片" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "生成结束帧图片" })).toBeDisabled();
    expect(refreshTimer).toBeDefined();

    await act(async () => {
      refreshTimer?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(apiModule.apiClient.listImages).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByDisplayValue("雨夜市场入口，林站在霓虹雨幕前。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成起始帧图片" })).toBeEnabled();
  });

  it("refreshes frame image URLs when a regenerated image keeps the same content path", async () => {
    vi.spyOn(apiModule.apiClient, "listImages")
      .mockResolvedValueOnce(imageListResponse)
      .mockResolvedValueOnce({
        currentBatch: imageListResponse.currentBatch,
        frames: imageListResponse.frames.map((frame) =>
          frame.id === "frame-start-1"
            ? {
                ...frame,
                updatedAt: "2024-01-01T00:00:30Z",
                sourceTaskId: "task-frame-start-2",
              }
            : frame,
        ),
      });
    vi.spyOn(apiModule.apiClient, "generateImageFrame").mockResolvedValue({
      id: "task-frame-image-2",
      projectId: "proj-1",
      type: "frame_image_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:30Z",
      updatedAt: "2024-01-01T00:00:30Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-frame-image-2/input.json",
        outputPath: "tasks/task-frame-image-2/output.json",
        logPath: "tasks/task-frame-image-2/log.txt",
      },
    });

    render(
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

    const image = (await screen.findByAltText("起始帧结果图")) as HTMLImageElement;
    expect(new URL(image.src).searchParams.get("v")).toBe("2024-01-01T00:00:09Z");

    fireEvent.click(screen.getByRole("button", { name: "生成起始帧图片" }));

    await waitFor(() => {
      expect(apiModule.apiClient.generateImageFrame).toHaveBeenCalledWith(
        "proj-1",
        "frame-start-1",
      );
    });

    await waitFor(() => {
      expect(apiModule.apiClient.listImages).toHaveBeenCalledTimes(2);
    });

    expect(new URL(screen.getByAltText("起始帧结果图").getAttribute("src")!, "http://localhost").searchParams.get("v")).toBe(
      "2024-01-01T00:00:30Z",
    );
  });

  it("clears visible prompt text while frame prompts are pending", async () => {
    vi.spyOn(apiModule.apiClient, "listImages")
      .mockResolvedValueOnce({
        currentBatch: imageListResponse.currentBatch,
        frames: imageListResponse.frames.map((frame) => ({
          ...frame,
          planStatus: "pending" as const,
          imageStatus: "pending" as const,
          sourceTaskId: "task-frame-prompt-pending",
        })),
      })
      .mockResolvedValueOnce(imageListResponse);

    renderPanel();

    await waitFor(() => {
      expect(apiModule.apiClient.listImages).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByDisplayValue("雨夜市场入口，林站在霓虹雨幕前。")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("尾帧定格在林与天际冷白尾光的对视。")).not.toBeInTheDocument();
    expect(screen.getAllByText("Prompt 仍在生成，完成前不能生成图片。")).toHaveLength(2);
  });
});
