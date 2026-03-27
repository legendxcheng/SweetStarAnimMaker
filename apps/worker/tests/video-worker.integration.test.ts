import {
  segmentVideoPromptGenerateQueueName,
  segmentVideoGenerateQueueName,
  videosGenerateQueueName,
} from "@sweet-star/core";
import { describe, expect, it, vi } from "vitest";

import { startWorker } from "../src/index";

describe("video worker integration", () => {
  it("routes video queue task ids into the corresponding process use cases", async () => {
    const processMasterPlotGenerateTask = { execute: vi.fn() };
    const processStoryboardGenerateTask = { execute: vi.fn() };
    const processCharacterSheetsGenerateTask = { execute: vi.fn() };
    const processCharacterSheetGenerateTask = { execute: vi.fn() };
    const processVideosGenerateTask = { execute: vi.fn() };
    const processSegmentVideoPromptGenerateTask = { execute: vi.fn() };
    const processSegmentVideoGenerateTask = { execute: vi.fn() };
    const close = vi.fn();
    const workerFactory = vi.fn(({ processor }) => ({
      processor,
      close,
    }));

    const worker = await startWorker({
      services: {
        processMasterPlotGenerateTask,
        processStoryboardGenerateTask,
        processCharacterSheetsGenerateTask,
        processCharacterSheetGenerateTask,
        processVideosGenerateTask,
        processSegmentVideoPromptGenerateTask,
        processSegmentVideoGenerateTask,
      },
      workerFactory,
    });

    const videosWorkerIndex = workerFactory.mock.calls.findIndex(
      ([input]) => input.queueName === videosGenerateQueueName,
    );
    const promptWorkerIndex = workerFactory.mock.calls.findIndex(
      ([input]) => input.queueName === segmentVideoPromptGenerateQueueName,
    );
    const segmentWorkerIndex = workerFactory.mock.calls.findIndex(
      ([input]) => input.queueName === segmentVideoGenerateQueueName,
    );
    const videosWorker = workerFactory.mock.results[videosWorkerIndex]?.value as {
      processor(job: { data: { taskId: string } }): Promise<void>;
    };
    const promptWorker = workerFactory.mock.results[promptWorkerIndex]?.value as {
      processor(job: { data: { taskId: string } }): Promise<void>;
    };
    const segmentWorker = workerFactory.mock.results[segmentWorkerIndex]?.value as {
      processor(job: { data: { taskId: string } }): Promise<void>;
    };

    await videosWorker.processor({
      data: {
        taskId: "task_videos_batch_1",
      },
    });
    await promptWorker.processor({
      data: {
        taskId: "task_video_prompt_1",
      },
    });
    await segmentWorker.processor({
      data: {
        taskId: "task_video_segment_1",
      },
    });

    expect(workerFactory).toHaveBeenCalledWith(
      expect.objectContaining({ queueName: videosGenerateQueueName }),
    );
    expect(workerFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: segmentVideoPromptGenerateQueueName,
        concurrency: 20,
      }),
    );
    expect(workerFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: segmentVideoGenerateQueueName,
        concurrency: 10,
      }),
    );
    expect(workerFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: videosGenerateQueueName,
        concurrency: 1,
      }),
    );
    expect(processVideosGenerateTask.execute).toHaveBeenCalledWith({
      taskId: "task_videos_batch_1",
    });
    expect(processSegmentVideoPromptGenerateTask.execute).toHaveBeenCalledWith({
      taskId: "task_video_prompt_1",
    });
    expect(processSegmentVideoGenerateTask.execute).toHaveBeenCalledWith({
      taskId: "task_video_segment_1",
    });

    await worker.close();

    expect(close).toHaveBeenCalledTimes(workerFactory.mock.calls.length);
  });
});
