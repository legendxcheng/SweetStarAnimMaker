import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import type { FinalCutRenderer } from "@sweet-star/core";

export interface CreateFfmpegFinalCutRendererOptions {
  ffmpegPath?: string;
}

export function createFfmpegFinalCutRenderer(
  options: CreateFfmpegFinalCutRendererOptions = {},
): FinalCutRenderer {
  const ffmpegPath = options.ffmpegPath ?? process.env.FFMPEG_PATH ?? "ffmpeg";

  return {
    async render(input) {
      const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-final-cut-"));
      const outputPath = path.join(outputDir, "final-cut.mp4");

      try {
        await runFfmpeg(ffmpegPath, input.manifestPath, outputPath);
        return new Uint8Array(await fs.readFile(outputPath));
      } finally {
        await fs.rm(outputDir, { recursive: true, force: true });
      }
    },
  };
}

async function runFfmpeg(ffmpegPath: string, manifestPath: string, outputPath: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      ffmpegPath,
      ["-y", "-f", "concat", "-safe", "0", "-i", manifestPath, "-c", "copy", outputPath],
      {
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `ffmpeg exited with code ${code ?? "unknown"}`));
    });
  });
}
