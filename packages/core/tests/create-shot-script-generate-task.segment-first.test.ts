import { describe, expect, it, vi } from "vitest";

import { createCreateShotScriptGenerateTaskUseCase } from "../src/use-cases/create-shot-script-generate-task";

describe("create shot script generate task use case - segment first", () => {
  it("creates a batch task that snapshots the storyboard and uses the segment prompt template", async () => {
    const projectRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_1-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 100,
        currentMasterPlotId: null,
        currentCharacterSheetBatchId: null,
        currentStoryboardId: "storyboard_1",
        currentShotScriptId: null,
        currentImageBatchId: null,
        status: "storyboard_approved",
        createdAt: "2026-03-23T12:00:00.000Z",
        updatedAt: "2026-03-23T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-23T12:00:00.000Z",
      }),
      updateStatus: vi.fn(),
    };
    const storyboardStorage = {
      readCurrentStoryboard: vi.fn().mockResolvedValue({
        id: "storyboard_1",
        title: "第1集",
        episodeTitle: "暴雨封路",
        sourceMasterPlotId: "master_plot_1",
        sourceTaskId: "task_storyboard",
        updatedAt: "2026-03-23T11:58:00.000Z",
        approvedAt: "2026-03-23T11:59:00.000Z",
        scenes: [
          {
            id: "scene_1",
            order: 1,
            name: "集市入口",
            dramaticPurpose: "封死主角退路。",
            segments: [
              {
                id: "segment_1",
                order: 1,
                durationSec: 6,
                visual: "积水集市口被杂乱摊棚堵住。",
                characterAction: "林夏停住脚步。",
                dialogue: "",
                voiceOver: "来得真快。",
                audio: "雨声和水声混在一起。",
                purpose: "确认对手先一步堵路。",
              },
            ],
          },
        ],
      }),
    };
    const taskRepository = {
      insert: vi.fn(),
      delete: vi.fn(),
      markFailed: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
    };
    const taskQueue = {
      enqueue: vi.fn(),
    };

    const useCase = createCreateShotScriptGenerateTaskUseCase({
      projectRepository: projectRepository as never,
      storyboardStorage: storyboardStorage as never,
      masterPlotStorage: { readCurrentMasterPlot: vi.fn() } as never,
      characterSheetRepository: { listCharactersByBatchId: vi.fn().mockResolvedValue([]) } as never,
      characterSheetStorage: { readCurrentCharacterSheet: vi.fn() } as never,
      taskRepository: taskRepository as never,
      taskFileStorage: taskFileStorage as never,
      taskQueue: taskQueue as never,
      taskIdGenerator: {
        generateTaskId: () => "task_shot_script_batch_1",
      },
      clock: {
        now: () => "2026-03-23T12:01:00.000Z",
      },
    });

    const result = await useCase.execute({ projectId: "proj_1" });

    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_shot_script_batch_1" }),
      input: expect.objectContaining({
        taskType: "shot_script_generate",
        sourceStoryboardId: "storyboard_1",
        promptTemplateKey: "shot_script.segment.generate",
        storyboard: expect.objectContaining({
          id: "storyboard_1",
        }),
      }),
    });
    expect(taskQueue.enqueue).toHaveBeenCalledWith({
      taskId: "task_shot_script_batch_1",
      queueName: "shot-script-generate",
      taskType: "shot_script_generate",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "shot_script_generating",
      updatedAt: "2026-03-23T12:01:00.000Z",
    });
    expect(result.type).toBe("shot_script_generate");
  });
});
