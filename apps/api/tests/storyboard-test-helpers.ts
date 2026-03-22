import {
  createCharacterSheetBatchRecord,
  createCharacterSheetRecord,
} from "@sweet-star/core";
import {
  createLocalDataPaths,
  createSqliteCharacterSheetRepository,
  createSqliteDb,
  createSqliteProjectRepository,
  createStoryboardStorage,
} from "@sweet-star/services";
import type { CurrentMasterPlot } from "@sweet-star/shared";

const approvedMasterPlot: CurrentMasterPlot = {
  id: "mp_20260321_ab12cd",
  title: "The Last Sky Choir",
  logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
  synopsis:
    "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
  mainCharacters: ["Rin", "Ivo"],
  coreConflict:
    "Rin must choose between private escape and saving the city that exiled her.",
  emotionalArc: "She moves from bitterness to sacrificial hope.",
  endingBeat: "Rin turns the comet's music into a rising tide of light.",
  targetDurationSec: 480,
  sourceTaskId: "task_20260321_master_plot",
  updatedAt: "2026-03-21T12:00:00.000Z",
  approvedAt: "2026-03-21T12:05:00.000Z",
};

export async function seedApprovedMasterPlot(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const storyboardStorage = createStoryboardStorage({ paths });

  await storyboardStorage.writeCurrentMasterPlot({
    storageDir: input.projectStorageDir,
    masterPlot: approvedMasterPlot,
  });
  projectRepository.updateCurrentMasterPlot({
    projectId: input.projectId,
    masterPlotId: approvedMasterPlot.id,
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: "master_plot_approved",
    updatedAt: approvedMasterPlot.approvedAt ?? approvedMasterPlot.updatedAt,
  });
  db.close();
}

export async function seedApprovedCharacterSheets(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
  batchId?: string;
  characterNames?: string[];
}) {
  const batchId = input.batchId ?? "char_batch_v1";
  const characterNames = input.characterNames ?? approvedMasterPlot.mainCharacters;
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const characterSheetRepository = createSqliteCharacterSheetRepository({ db });

  characterSheetRepository.insertBatch(
    createCharacterSheetBatchRecord({
      id: batchId,
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      sourceMasterPlotId: approvedMasterPlot.id,
      characterCount: characterNames.length,
      createdAt: "2026-03-21T12:06:00.000Z",
      updatedAt: "2026-03-21T12:10:00.000Z",
    }),
  );

  characterNames.forEach((characterName, index) => {
    const characterId = `char_${characterName.toLowerCase()}_${index + 1}`;
    characterSheetRepository.insertCharacter({
      ...createCharacterSheetRecord({
        id: characterId,
        projectId: input.projectId,
        projectStorageDir: input.projectStorageDir,
        batchId,
        sourceMasterPlotId: approvedMasterPlot.id,
        characterName,
        promptTextGenerated: `${characterName} generated prompt`,
        promptTextCurrent: `${characterName} current prompt`,
        updatedAt: "2026-03-21T12:09:00.000Z",
      }),
      status: "approved",
      approvedAt: "2026-03-21T12:10:00.000Z",
    });
  });

  projectRepository.updateCurrentCharacterSheetBatch({
    projectId: input.projectId,
    batchId,
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: "character_sheets_approved",
    updatedAt: "2026-03-21T12:10:00.000Z",
  });
  db.close();
}
