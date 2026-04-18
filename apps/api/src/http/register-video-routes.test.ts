import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";

import { createApiErrorHandler } from "./error-handler";
import { registerVideoRoutes } from "./register-video-routes";

describe("register video routes", () => {
  it("saves segment video config through the segment config endpoint", async () => {
    const services = createServices();
    services.saveSegmentVideoConfig.execute.mockResolvedValue({
      id: "video_segment_1",
      promptTextCurrent: "operator prompt",
      referenceImages: [],
      referenceAudios: [],
    });
    const app = await createApp(services);

    const response = await app.inject({
      method: "PUT",
      url: "/projects/proj_1/videos/segments/video_segment_1/config",
      payload: {
        promptTextCurrent: "operator prompt",
        referenceImages: [
          {
            id: "ref_img_1",
            assetPath:
              "videos/batches/video_batch_1/segments/scene_1__segment_1/references/images/ref_img_1.png",
            source: "manual",
            order: 0,
            sourceShotId: null,
            label: "Continuity frame",
          },
        ],
        referenceAudios: [
          {
            id: "ref_audio_1",
            assetPath:
              "videos/batches/video_batch_1/segments/scene_1__segment_1/references/audios/ref_audio_1.wav",
            source: "manual",
            order: 0,
            label: "Rain guide",
            durationSec: 8,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(services.saveSegmentVideoConfig.execute).toHaveBeenCalledWith({
      projectId: "proj_1",
      videoId: "video_segment_1",
      promptTextCurrent: "operator prompt",
      referenceImages: [
        expect.objectContaining({
          id: "ref_img_1",
          source: "manual",
        }),
      ],
      referenceAudios: [
        expect.objectContaining({
          id: "ref_audio_1",
          source: "manual",
        }),
      ],
    });
    await app.close();
  });

  it("creates a segment video generate task through the segment generate endpoint", async () => {
    const services = createServices();
    services.regenerateVideoSegment.execute.mockResolvedValue({
      id: "task_segment_video_1",
      type: "segment_video_generate",
    });
    const app = await createApp(services);

    const response = await app.inject({
      method: "POST",
      url: "/projects/proj_1/videos/segments/video_segment_1/generate",
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(services.regenerateVideoSegment.execute).toHaveBeenCalledWith({
      projectId: "proj_1",
      videoId: "video_segment_1",
    });
    await app.close();
  });

  it("uploads segment reference audio and rejects non-audio uploads", async () => {
    const services = createServices();
    services.uploadSegmentVideoAudio.execute.mockResolvedValue({
      id: "video_segment_1",
      referenceAudios: [
        {
          id: "ref_audio_1",
          assetPath:
            "videos/batches/video_batch_1/segments/scene_1__segment_1/references/audios/ref_audio_1.mp3",
          source: "manual",
          order: 0,
          label: "Footsteps",
          durationSec: 4,
        },
      ],
    });
    const app = await createApp(services);
    const audioPayload = createMultipartPayload({
      fields: [
        { name: "label", value: "Footsteps" },
        { name: "durationSec", value: "4" },
      ],
      files: [
        {
          fieldName: "file",
          fileName: "footsteps.mp3",
          contentType: "audio/mpeg",
          bytes: Buffer.from([1, 2, 3]),
        },
      ],
    });

    const uploadResponse = await app.inject({
      method: "POST",
      url: "/projects/proj_1/videos/segments/video_segment_1/reference-audios",
      headers: {
        "content-type": audioPayload.contentType,
      },
      payload: audioPayload.body,
    });

    expect(uploadResponse.statusCode).toBe(200);
    expect(services.uploadSegmentVideoAudio.execute).toHaveBeenCalledWith({
      projectId: "proj_1",
      videoId: "video_segment_1",
      fileName: "footsteps.mp3",
      content: Uint8Array.from([1, 2, 3]),
      label: "Footsteps",
      durationSec: 4,
    });

    const textPayload = createMultipartPayload({
      files: [
        {
          fieldName: "file",
          fileName: "notes.txt",
          contentType: "text/plain",
          bytes: Buffer.from("not audio", "utf8"),
        },
      ],
    });

    const rejectedResponse = await app.inject({
      method: "POST",
      url: "/projects/proj_1/videos/segments/video_segment_1/reference-audios",
      headers: {
        "content-type": textPayload.contentType,
      },
      payload: textPayload.body,
    });

    expect(rejectedResponse.statusCode).toBe(400);
    await app.close();
  });
});

async function createApp(services: ReturnType<typeof createServices>) {
  const app = Fastify();

  app.register(multipart);
  app.setErrorHandler(createApiErrorHandler());
  registerVideoRoutes(app, services as never);
  await app.ready();

  return app;
}

function createServices() {
  return {
    createVideosGenerateTask: { execute: vi.fn() },
    createFinalCutGenerateTask: { execute: vi.fn() },
    getFinalCut: { execute: vi.fn() },
    listVideos: { execute: vi.fn() },
    getVideo: { execute: vi.fn() },
    regenerateVideoSegment: { execute: vi.fn() },
    updateVideoPrompt: { execute: vi.fn() },
    saveSegmentVideoConfig: { execute: vi.fn() },
    uploadSegmentVideoAudio: { execute: vi.fn() },
    regenerateVideoPrompt: { execute: vi.fn() },
    regenerateAllVideoPrompts: { execute: vi.fn() },
    approveVideoSegment: { execute: vi.fn() },
    approveAllVideoSegments: { execute: vi.fn() },
  };
}

function createMultipartPayload(input: {
  fields?: Array<{ name: string; value: string }>;
  files: Array<{
    fieldName: string;
    fileName: string;
    contentType: string;
    bytes: Buffer;
  }>;
}) {
  const boundary = "----sweet-star-video-boundary";
  const chunks: Buffer[] = [];

  for (const field of input.fields ?? []) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${field.name}"\r\n\r\n${field.value}\r\n`,
        "utf8",
      ),
    );
  }

  for (const file of input.files) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldName}"; filename="${file.fileName}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
        "utf8",
      ),
    );
    chunks.push(file.bytes);
    chunks.push(Buffer.from("\r\n", "utf8"));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));

  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
