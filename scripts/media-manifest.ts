/**
 * Writes docs/research/media-manifest.json: every piece of artwork the archive
 * records, with its provenance, and every season and ranked experience that
 * has none.
 *
 * Provenance comes from the data the archive is built from — the HHN dataset
 * and each Haunt Pack in data/ — so the manifest describes the archive, not
 * one machine. Where a database is given (HAUNT_RANKER_DB_PATH), it also says
 * which images this installation holds an offline copy of.
 *
 * Usage: npx tsx scripts/media-manifest.ts
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "research", "media-manifest.json");

const CLASSIFICATION: Record<string, string> = {
  bundled: "approved asset",
  local: "user-provided",
  reference: "external reference only",
  unclear: "redistribution unclear",
};

interface Source {
  id: string;
  title: string;
  url?: string | null;
  publisher?: string | null;
}
interface Media {
  id: string;
  kind: string;
  url: string;
  attribution?: string | null;
  licenseNotes?: string | null;
  sourceId?: string | null;
  distribution?: string;
}

interface ManifestEntry {
  id: string;
  haunt: string;
  season: string;
  experience: string | null;
  experienceId: string | null;
  kind: string;
  url: string;
  host: string;
  owner: string | null;
  foundOn: string | null;
  foundOnTitle: string | null;
  licenseNotes: string | null;
  distribution: string;
  classification: string;
  offlineCopy: { path: string; bytes: number } | null;
}

const entries: ManifestEntry[] = [];
const unresolved: Array<{
  haunt: string;
  season: string;
  experience: string | null;
  id: string;
  type: string;
}> = [];

function add(
  haunt: string,
  season: string,
  experience: { id: string; name: string } | null,
  media: Media,
  sources: Map<string, Source>,
) {
  const source = media.sourceId ? sources.get(media.sourceId) : undefined;
  const distribution = media.distribution ?? "reference";
  entries.push({
    id: media.id,
    haunt,
    season,
    experience: experience?.name ?? null,
    experienceId: experience?.id ?? null,
    kind: media.kind,
    url: media.url,
    host: new URL(media.url).hostname,
    owner: media.attribution ?? null,
    foundOn: source?.url ?? null,
    foundOnTitle: source?.title ?? null,
    licenseNotes: media.licenseNotes ?? null,
    distribution,
    classification: CLASSIFICATION[distribution] ?? distribution,
    offlineCopy: null,
  });
}

// --- Halloween Horror Nights: the archive dataset ---------------------------
const hhn = JSON.parse(readFileSync(join(ROOT, "data", "hhn-archive.json"), "utf8"));
const hhnSources = new Map<string, Source>(hhn.sources.map((s: Source) => [s.id, s]));
const hhnSeasonName = new Map<string, string>(
  hhn.events.map((e: { id: string; name: string }) => [e.id, e.name]),
);
for (const event of hhn.events) {
  const media: Media[] = event.media ?? [];
  media.forEach((m) => add("Halloween Horror Nights", event.name, null, m, hhnSources));
  if (!media.some((m) => m.kind !== "map")) {
    unresolved.push({
      haunt: "Halloween Horror Nights",
      season: event.name,
      experience: null,
      id: event.id,
      type: "season",
    });
  }
}
for (const attraction of hhn.attractions) {
  const media: Media[] = attraction.media ?? [];
  const season = hhnSeasonName.get(attraction.eventId) ?? attraction.eventId;
  media.forEach((m) => add("Halloween Horror Nights", season, attraction, m, hhnSources));
  if (media.length === 0) {
    unresolved.push({
      haunt: "Halloween Horror Nights",
      season,
      experience: attraction.name,
      id: attraction.id,
      type: attraction.type,
    });
  }
}

// --- Every Haunt Pack in data/ ------------------------------------------------
for (const file of readdirSync(join(ROOT, "data"))
  .filter((f) => f.endsWith(".hauntpack.json"))
  .sort()) {
  const pack = JSON.parse(readFileSync(join(ROOT, "data", file), "utf8"));
  const haunt = pack.haunt.name as string;
  const sources = new Map<string, Source>((pack.sources ?? []).map((s: Source) => [s.id, s]));
  const seasonName = new Map<string, string>(
    pack.seasons.map((s: { id: string; name: string }) => [s.id, s.name]),
  );
  const ranked = new Set(
    pack.experienceTypes
      .filter((t: { category: string }) => t.category === "house" || t.category === "scare_zone")
      .map((t: { id: string }) => t.id),
  );
  for (const season of pack.seasons) {
    const media: Media[] = season.media ?? [];
    media.forEach((m) => add(haunt, season.name, null, m, sources));
    if (!media.some((m) => m.kind !== "map")) {
      unresolved.push({
        haunt,
        season: season.name,
        experience: null,
        id: season.id,
        type: "season",
      });
    }
  }
  for (const experience of pack.experiences) {
    const media: Media[] = experience.media ?? [];
    const season = seasonName.get(experience.seasonId) ?? experience.seasonId;
    media.forEach((m) => add(haunt, season, experience, m, sources));
    if (media.length === 0) {
      unresolved.push({
        haunt,
        season,
        experience: experience.name,
        id: experience.id,
        type: ranked.has(experience.typeId) ? "ranked" : "special experience",
      });
    }
  }
}

// --- This installation's offline copies, where a database is given -----------
const dbPath = process.env.HAUNT_RANKER_DB_PATH;
let machine: { database: string; copies: number; bytes: number } | null = null;
if (dbPath && existsSync(dbPath)) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const rows = db
    .prepare("SELECT id, local_path FROM media WHERE local_path IS NOT NULL")
    .all() as Array<{
    id: string;
    local_path: string;
  }>;
  const byId = new Map(rows.map((row) => [row.id, row.local_path]));
  let bytes = 0;
  for (const entry of entries) {
    const path = byId.get(entry.id);
    const file = path ? join(dirname(dbPath), path) : null;
    if (path && file && existsSync(file)) {
      const size = statSync(file).size;
      entry.offlineCopy = { path, bytes: size };
      bytes += size;
    }
  }
  machine = { database: "the local installation's database", copies: rows.length, bytes };
  db.close();
}

const count = (key: keyof ManifestEntry) =>
  entries.reduce<Record<string, number>>((acc, entry) => {
    const value = String(entry[key]);
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

const manifest = {
  generatedBy: "scripts/media-manifest.ts",
  policy:
    "No artwork is generated. The app never loads an image from the web: it shows copies it holds (offline copies saved for personal use, or user-provided files) and links to everything else. Nothing is bundled with the app.",
  summary: {
    records: entries.length,
    byHaunt: count("haunt"),
    byClassification: count("classification"),
    byKind: count("kind"),
    byHost: count("host"),
    offlineCopies: machine,
    unresolved: unresolved.length,
  },
  media: entries,
  unresolved,
};

writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `${entries.length} media records, ${unresolved.length} without artwork` +
    (machine
      ? `, ${machine.copies} offline copies (${(machine.bytes / 1048576).toFixed(1)} MB)`
      : "") +
    ` → ${OUT}`,
);
