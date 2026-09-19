import type { ArchiveDataset } from "../models/archiveDataset";
import type { ArchiveImportRepository } from "../repositories/archiveImportRepository";
import type { ArchiveImportReport, PlannedImport } from "./importOperations";
import { planImport } from "./importOperations";

/**
 * Raised when a dataset can't be applied. Carries every reason, because
 * fixing a dataset one error per attempt is miserable.
 */
export class ArchiveImportError extends Error {
  constructor(
    message: string,
    readonly problems: string[],
  ) {
    super(message);
    this.name = "ArchiveImportError";
  }
}

/**
 * Works out what an import would change, without changing anything.
 *
 * Worth running on its own: the report is what a person should see before
 * agreeing to an archive update, and the errors are the ones only the stored
 * archive can reveal.
 */
export async function previewImport(
  dataset: ArchiveDataset,
  repository: ArchiveImportRepository,
): Promise<PlannedImport> {
  return planImport(dataset, await repository.readState());
}

/**
 * Applies a validated dataset to the archive.
 *
 * The order is the guarantee: the whole plan is worked out first, refused as a
 * whole if any part of it is impossible, and only then executed — and if a
 * write fails part way through, every write already made is undone.
 *
 * What it may change: event years, attractions, their park assignments,
 * characters, relations, sources, citations and media metadata. What it never
 * touches: ratings, notes, ranking positions and settings. Records the dataset
 * doesn't mention are left exactly as they are; this is an archive update, not
 * a replacement.
 */
export async function importArchiveDataset(
  dataset: ArchiveDataset,
  repository: ArchiveImportRepository,
): Promise<ArchiveImportReport> {
  const plan = await previewImport(dataset, repository);

  if (plan.errors.length > 0) {
    throw new ArchiveImportError(
      "This dataset can't be applied to the archive as it stands. Nothing was changed.",
      plan.errors,
    );
  }

  await repository.execute(plan.operations);
  return plan.report;
}
