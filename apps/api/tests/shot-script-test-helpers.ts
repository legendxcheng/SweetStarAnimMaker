import { createTaskRecord } from "@sweet-star/core";
import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteShotScriptReviewRepository,
  createSqliteTaskRepository,
  createShotScriptStorage,
} from "@sweet-star/services";
import type { CurrentShotScript, ShotScriptReviewSummary } from "@sweet-star/shared";

export async function seedCurrentShotScript(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
  shotScript: CurrentShotScript;
  status: "shot_script_in_review" | "shot_script_approved";
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const shotScriptStorage = createShotScriptStorage({ paths });

  await shotScriptStorage.writeCurrentShotScript({
    storageDir: input.projectStorageDir,
    shotScript: input.shotScript,
  });
  projectRepository.updateCurrentShotScript({
    projectId: input.projectId,
    shotScriptId: input.shotScript.id,
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: input.status,
    updatedAt: input.shotScript.approvedAt ?? input.shotScript.updatedAt,
  });
  db.close();
}

export async function seedShotScriptReviewWorkspace(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
  shotScript: CurrentShotScript;
  latestReview?: ShotScriptReviewSummary;
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const taskRepository = createSqliteTaskRepository({ db });
  const reviewRepository = createSqliteShotScriptReviewRepository({ db });

  taskRepository.insert(
    createTaskRecord({
      id: "task_20260322_shot_script",
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      type: "shot_script_generate",
      queueName: "shot-script-generate",
      createdAt: "2026-03-22T12:00:00.000Z",
      updatedAt: "2026-03-22T12:05:00.000Z",
      status: "succeeded",
      startedAt: "2026-03-22T12:01:00.000Z",
      finishedAt: "2026-03-22T12:05:00.000Z",
    }),
  );

  if (input.latestReview) {
    reviewRepository.insert(input.latestReview);
  }

  db.close();

  await seedCurrentShotScript({
    tempDir: input.tempDir,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    shotScript: input.shotScript,
    status: "shot_script_in_review",
  });
}
