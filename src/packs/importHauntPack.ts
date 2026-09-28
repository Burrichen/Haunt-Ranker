import type { ArchiveImportRepository } from "../repositories/archiveImportRepository";
import type { HauntPackRepository } from "../repositories/hauntPackRepository";
import type { HauntPack } from "./hauntPack";
import { planPackImport, type PackImportPlan, type PackPreview } from "./planPackImport";
import { readHauntPack, validateHauntPack, type PackValidation } from "./validateHauntPack";

/** A pack that failed before anything was written. The archive is untouched. */
export class PackImportError extends Error {
  constructor(
    message: string,
    readonly problems: string[],
  ) {
    super(message);
    this.name = "PackImportError";
  }
}

export interface PackPlanResult {
  pack: HauntPack;
  plan: PackImportPlan;
  /** Everything the preview shows, validation warnings included. */
  preview: PackPreview;
}

/**
 * Reads a pack and works out what importing it would do — without writing
 * anything.
 *
 * Two gates, in order: the pack has to be valid on its own terms, and then
 * possible against what the archive already holds. Only then is there a
 * preview to show, and only then can a person agree to it.
 */
export function preparePackImport(
  input: string | unknown,
  state: Parameters<typeof planPackImport>[1],
): PackPlanResult {
  // An id the archive already holds for the same haunt is the pack
  // describing an existing record, not inventing an un-namespaced one.
  const isEstablished = (id: string, hauntId: string): boolean => {
    for (const rows of [state.venues, state.experienceTypes, state.seasons]) {
      const row = rows.get(id);
      if (row) {
        return row.haunt_id === hauntId;
      }
    }
    const attraction = state.attractions.get(id);
    return (
      attraction !== undefined &&
      state.seasons.get(String(attraction.event_year_id))?.haunt_id === hauntId
    );
  };
  const validation: PackValidation =
    typeof input === "string"
      ? readHauntPack(input, { isEstablished })
      : validateHauntPack(input, { isEstablished });

  if (!validation.ok) {
    throw new PackImportError("This Haunt Pack can't be read.", validation.errors);
  }

  const plan = planPackImport(validation.pack, state);
  if (plan.errors.length > 0) {
    throw new PackImportError("This Haunt Pack can't be imported into this archive.", plan.errors);
  }

  return {
    pack: validation.pack,
    plan,
    preview: {
      ...plan.preview,
      warnings: [...validation.warnings, ...plan.preview.warnings],
    },
  };
}

export interface PackImportDependencies {
  archive: ArchiveImportRepository;
  packs: HauntPackRepository;
  /** Ids are generated outside so a test can make them predictable. */
  newId: () => string;
}

/**
 * Applies a prepared plan.
 *
 * The writes go through the archive importer's undo log, so a failure part
 * way through puts everything back: an import either lands completely or
 * leaves the archive exactly as it was. That log is also what makes this
 * safe without a SQL transaction, which the Tauri SQL plugin's connection
 * pool can't give us across separate calls.
 */
export async function applyPackImport(
  prepared: PackPlanResult,
  deps: PackImportDependencies,
): Promise<PackPreview> {
  const { pack, plan, preview } = prepared;

  await deps.archive.execute(plan.operations);

  await deps.packs.recordImport({
    id: deps.newId(),
    packId: pack.pack.id,
    packVersion: pack.pack.version,
    schemaId: pack.schema,
    hauntId: pack.haunt.id,
    hauntName: pack.haunt.name,
    generatedAt: pack.pack.generatedAt ?? null,
    summary: JSON.stringify({
      seasons: preview.seasons,
      experiences: preview.experiences,
      sources: preview.sources,
      venues: preview.venues,
      experienceTypes: preview.experienceTypes,
      mediaReferences: preview.mediaReferences,
      citationsAdded: preview.citationsAdded,
      conflicts: preview.conflicts.length,
      warnings: preview.warnings.length,
    }),
    provenanceNotes: pack.pack.provenance ?? null,
  });

  return preview;
}

/** Reads the counts back out of a recorded import, for the provenance list. */
export function parseImportSummary(summary: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(summary);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
