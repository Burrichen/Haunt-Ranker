/**
 * The archive datasets the repository ships, one per haunt. The data scripts
 * take `--haunt <key>` (default `hhn`) and read everything haunt-specific
 * from here, so validating and importing can't disagree about a file.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export interface DatasetProfile {
  /** Repository-relative path of the dataset file. */
  file: string;
  /** Repository-relative path of the validation report. */
  report: string;
  /** The venues this haunt's attractions can be at. */
  parks: string[];
  /** The earliest season the archive covers. */
  minYear: number;
  /**
   * For an archive defined as "the mazes that debuted in these years": how
   * many debuted in each year. Validation fails if the file disagrees.
   */
  debutsByYear?: Record<number, number>;
}

export const DATASETS: Record<string, DatasetProfile> = {
  hhn: {
    file: "data/hhn-archive.json",
    report: "docs/research/hhn-import-validation.md",
    parks: ["hollywood", "orlando"],
    minYear: 2010,
  },
  knotts: {
    file: "data/knotts-archive.json",
    report: "docs/research/knotts-import-validation.md",
    parks: ["knotts-berry-farm"],
    // Knott's canonical debut archive covers 2021–2026 only. Older history
    // is incomplete and will be backfilled later.
    minYear: 2021,
    debutsByYear: { 2021: 1, 2022: 2, 2023: 3, 2024: 2, 2025: 2, 2026: 2 },
  },
};

/** The dataset named by `--haunt <key>` on the command line, or HHN's. */
export function selectedDataset(argv: string[] = process.argv): {
  key: string;
  profile: DatasetProfile;
  path: string;
  reportPath: string;
} {
  const flag = argv.indexOf("--haunt");
  const key = flag >= 0 ? argv[flag + 1] : "hhn";
  const profile = DATASETS[key];
  if (!profile) {
    throw new Error(
      `Unknown --haunt "${key}". Known datasets: ${Object.keys(DATASETS).join(", ")}.`,
    );
  }
  return {
    key,
    profile,
    path: join(ROOT, profile.file),
    reportPath: join(ROOT, profile.report),
  };
}
