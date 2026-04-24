import type { SegmentVideoRecord } from "@sweet-star/shared";

import { toPublicSegmentVideoRecord } from "../domain/video";
import { ProjectNotFoundError, ProjectValidationError } from "../errors/project-errors";
import { SegmentVideoNotFoundError } from "../errors/video-errors";
import type { Clock } from "../ports/clock";
import type { ProjectRepository } from "../ports/project-repository";
import type { VideoRepository } from "../ports/video-repository";
import type { VideoStorage } from "../ports/video-storage";
import { deriveProjectVideoStatus } from "./derive-project-video-status";

export interface UploadSegmentVideoAudioInput {
  projectId: string;
  videoId: string;
  fileName: string;
  content: Uint8Array;
  label?: string | null;
  durationSec?: number | null;
}

export interface UploadSegmentVideoAudioUseCase {
  execute(input: UploadSegmentVideoAudioInput): Promise<SegmentVideoRecord>;
}

export interface UploadSegmentVideoAudioUseCaseDependencies {
  projectRepository: ProjectRepository;
  videoRepository: VideoRepository;
  videoStorage: VideoStorage;
  clock: Clock;
}

export function createUploadSegmentVideoAudioUseCase(
  dependencies: UploadSegmentVideoAudioUseCaseDependencies,
): UploadSegmentVideoAudioUseCase {
  return {
    async execute(input) {
      if (!dependencies.videoStorage.persistSegmentReferenceAudio) {
        throw new ProjectValidationError("Segment reference audio storage is not configured");
      }

      const project = await dependencies.projectRepository.findById(input.projectId);

      if (!project) {
        throw new ProjectNotFoundError(input.projectId);
      }

      const segment = await dependencies.videoRepository.findSegmentById(input.videoId);

      if (
        !segment ||
        segment.projectId !== project.id ||
        segment.batchId !== project.currentVideoBatchId
      ) {
        throw new SegmentVideoNotFoundError(input.videoId);
      }

      const nextOrder =
        Math.max(-1, ...segment.referenceAudios.map((referenceAudio) => referenceAudio.order)) + 1;
      const audioId = `ref_audio_${nextOrder + 1}`;
      const assetPath = await dependencies.videoStorage.persistSegmentReferenceAudio({
        projectStorageDir: segment.projectStorageDir,
        batchId: segment.batchId,
        sceneId: segment.sceneId,
        segmentId: segment.segmentId,
        audioId,
        fileExtension: toFileExtension(input.fileName),
        content: input.content,
      });
      const timestamp = dependencies.clock.now();
      const updatedSegment = {
        ...segment,
        status: segment.status === "approved" ? ("in_review" as const) : segment.status,
        approvedAt: segment.status === "approved" ? null : segment.approvedAt,
        referenceAudios: [
          ...segment.referenceAudios,
          {
            id: audioId,
            assetPath,
            source: "manual" as const,
            order: nextOrder,
            label: input.label ?? null,
            durationSec: input.durationSec ?? null,
          },
        ],
        updatedAt: timestamp,
      };

      await dependencies.videoRepository.updateSegment(updatedSegment);
      const segments = await dependencies.videoRepository.listSegmentsByBatchId(segment.batchId);
      await dependencies.projectRepository.updateStatus({
        projectId: project.id,
        status: deriveProjectVideoStatus(segments, updatedSegment),
        updatedAt: timestamp,
      });

      return toPublicSegmentVideoRecord(updatedSegment);
    },
  };
}

function toFileExtension(fileName: string) {
  const extensionStart = fileName.lastIndexOf(".");

  if (extensionStart < 0) {
    return ".bin";
  }

  return fileName.slice(extensionStart).toLowerCase();
}
