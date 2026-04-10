import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShotScriptPhasePanel } from "../../src/components/shot-script-phase-panel";
import * as apiModule from "../../src/services/api-client";

vi.mock("../../src/services/api-client");

const baseProject = {
  id: "proj-1",
  name: "Test Project",
  slug: "test-project",
  status: "shot_script_approved" as const,
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
  currentStoryboard: {
    id: "storyboard-1",
    title: "The Last Sky Choir",
    episodeTitle: "Episode 1",
    sourceMasterPlotId: "mp-1",
    sourceTaskId: "task-storyboard-1",
    updatedAt: "2024-01-01T00:00:03Z",
    approvedAt: "2024-01-01T00:00:05Z",
    sceneCount: 1,
    segmentCount: 1,
    totalDurationSec: 4,
  },
  currentShotScript: {
    id: "shot-script-1",
    title: "Episode 1 Shot Script",
    sourceStoryboardId: "storyboard-1",
    sourceTaskId: "task-shot-script-1",
    updatedAt: "2024-01-01T00:00:07Z",
    approvedAt: "2024-01-01T00:00:08Z",
    segmentCount: 1,
    shotCount: 1,
    totalDurationSec: 4,
  },
  currentImageBatch: null,
  currentVideoBatch: null,
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
          frameDependency: "start_frame_only" as const,
        },
      ],
    },
  ],
};

function renderPanel(project = baseProject, onProjectRefresh = vi.fn()) {
  return render(
    <MemoryRouter>
      <ShotScriptPhasePanel
        project={project}
        task={null}
        taskError={null}
        creatingTask={false}
        disableGenerate={false}
        onGenerate={vi.fn()}
        onProjectRefresh={onProjectRefresh}
      />
    </MemoryRouter>,
  );
}

describe("ShotScriptPhasePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks image prompt generation before shot-script approval when no image batch exists", async () => {
    const onProjectRefresh = vi.fn();
    vi.spyOn(apiModule.apiClient, "getCurrentShotScript").mockResolvedValue(fullShotScript);
    vi.spyOn(apiModule.apiClient, "createImagesGenerateTask").mockResolvedValue({
      id: "task_images_generate_1",
      projectId: "proj-1",
      type: "images_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:09Z",
      updatedAt: "2024-01-01T00:00:09Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task_images_generate_1/input.json",
        outputPath: "tasks/task_images_generate_1/output.json",
        logPath: "tasks/task_images_generate_1/log.txt",
      },
    });

    renderPanel(
      {
        ...baseProject,
        status: "shot_script_in_review",
        currentShotScript: {
          ...baseProject.currentShotScript,
          approvedAt: null,
        },
      },
      onProjectRefresh,
    );

    await waitFor(() => {
      expect(apiModule.apiClient.getCurrentShotScript).toHaveBeenCalledWith("proj-1");
    });

    const button = screen.getByRole("button", { name: "重新生成所有未完成的Prompt" });
    expect(button).toBeDisabled();
    fireEvent.click(button);

    expect(apiModule.apiClient.createImagesGenerateTask).not.toHaveBeenCalled();
    expect(onProjectRefresh).not.toHaveBeenCalled();
  });

  it("regenerates only unfinished image prompts when an image batch already exists", async () => {
    const onProjectRefresh = vi.fn();
    vi.spyOn(apiModule.apiClient, "getCurrentShotScript").mockResolvedValue(fullShotScript);
    vi.spyOn(apiModule.apiClient, "regenerateUnfinishedImagePrompts").mockResolvedValue({
      batchId: "image-batch-1",
      frameCount: 2,
      taskIds: ["task_frame_prompt_1", "task_frame_prompt_2"],
    });

    renderPanel(
      {
        ...baseProject,
        status: "images_in_review",
        currentImageBatch: {
          id: "image-batch-1",
          sourceShotScriptId: "shot-script-1",
          shotCount: 1,
          totalRequiredFrameCount: 2,
          approvedShotCount: 0,
          updatedAt: "2024-01-01T00:00:09Z",
        },
      },
      onProjectRefresh,
    );

    await waitFor(() => {
      expect(apiModule.apiClient.getCurrentShotScript).toHaveBeenCalledWith("proj-1");
    });

    fireEvent.click(screen.getByRole("button", { name: "重新生成所有未完成的Prompt" }));

    await waitFor(() => {
      expect(apiModule.apiClient.regenerateUnfinishedImagePrompts).toHaveBeenCalledWith("proj-1");
    });
    expect(onProjectRefresh).toHaveBeenCalledTimes(1);
  });
});
