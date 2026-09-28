import { fromStoredCategory } from "../repositories/experienceTypeRepository";
import { currentPackFormat, renderPackFormat, type PackFormat } from "./packFormat";
import type { PackState } from "./packState";
import { MAX_CALENDAR_YEAR, MIN_CALENDAR_YEAR } from "./packVocabulary";

/**
 * Admin → Add a Haunt → Generate Research Prompt.
 *
 * Haunt Ranker has no AI inside it and never calls one. What it can do is
 * write the brief: a prompt a person pastes into whichever assistant they
 * already use, which says exactly what a Haunt Pack is — in the schema this
 * build reads, from the same description the format panel shows — and how
 * the research behind it has to be done. The pack comes back by paste and
 * goes through the same validation and preview as any other.
 */

/** More years than this and one reply can't hold the research. */
export const MAX_RESEARCH_YEARS = 15;

export type YearsParse = { ok: true; years: number[] } | { ok: false; error: string };

/**
 * Reads "2024–2026", "2024-2026", "2019, 2021, 2023" or "2025" into a
 * sorted list of years. Ranges and single years can be mixed.
 */
export function parseYears(input: string): YearsParse {
  const trimmed = input.trim();
  if (trimmed === "") {
    return { ok: false, error: "Enter a year, or a range like 2024–2026." };
  }

  // "2024 – 2026" and "2024 to 2026" become "2024-2026" first, so the
  // spaces inside a range don't split it in two.
  const normalised = trimmed.replace(/(\d{4})\s*(?:[-–—]|\bto\b)\s*(\d{4})/gi, "$1-$2");
  const years = new Set<number>();
  for (const part of normalised.split(/[,;\s]+/)) {
    const piece = part.trim();
    if (piece === "") {
      continue;
    }
    const range = /^(\d{4})-(\d{4})$/.exec(piece);
    const single = /^(\d{4})$/.exec(piece);
    if (!range && !single) {
      return { ok: false, error: `"${piece}" isn't a year or a range of years.` };
    }
    const first = Number(range ? range[1] : single![1]);
    const last = Number(range ? range[2] : single![1]);
    if (last < first) {
      return { ok: false, error: `${piece} runs backwards — put the earlier year first.` };
    }
    for (const year of [first, last]) {
      if (year < MIN_CALENDAR_YEAR || year > MAX_CALENDAR_YEAR) {
        return { ok: false, error: `${year} isn't a plausible year.` };
      }
    }
    if (last - first + 1 > MAX_RESEARCH_YEARS) {
      return {
        ok: false,
        error: `That's more than ${MAX_RESEARCH_YEARS} years for one pack. Split it into smaller ranges.`,
      };
    }
    for (let year = first; year <= last; year += 1) {
      years.add(year);
    }
  }

  if (years.size > MAX_RESEARCH_YEARS) {
    return {
      ok: false,
      error: `That's more than ${MAX_RESEARCH_YEARS} years for one pack. Split it into smaller ranges.`,
    };
  }
  return { ok: true, years: [...years].sort((a, b) => a - b) };
}

/** "2024–2026" for a run, "2019, 2021, 2023" otherwise. */
export function describeYears(years: number[]): string {
  if (years.length === 0) {
    return "";
  }
  const contiguous = years.every((year, index) => index === 0 || year === years[index - 1] + 1);
  if (contiguous && years.length > 1) {
    return `${years[0]}–${years[years.length - 1]}`;
  }
  return years.join(", ");
}

/** "Knott's Scary Farm" → "knotts-scary-farm": the id a new haunt would most likely be given. */
export function suggestHauntId(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’‘`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** What the archive already holds for the haunt being researched. */
export interface ExistingHauntContext {
  hauntId: string;
  name: string;
  venues: Array<{ id: string; name: string }>;
  experienceTypes: Array<{ id: string; category: string; labelOne: string }>;
  /** Only the requested years. */
  seasons: Array<{ id: string; calendarYear: number; name: string }>;
  /** Only those filed under the requested years' seasons. */
  experiences: Array<{ id: string; name: string; seasonId: string }>;
}

function comparable(value: unknown): string {
  return typeof value === "string" ? suggestHauntId(value) : "";
}

/**
 * Finds the installed haunt a typed name means, if there is one — by id,
 * name or short name, ignoring case and apostrophes. "knotts scary farm"
 * and "Knott’s Scary Farm" both find `knotts-scary-farm`.
 */
export function matchInstalledHaunt(state: PackState, name: string): string | null {
  const wanted = suggestHauntId(name);
  if (wanted === "") {
    return null;
  }
  for (const [id, row] of state.haunts) {
    if (id === wanted || comparable(row.name) === wanted || comparable(row.short_name) === wanted) {
      return id;
    }
  }
  return null;
}

function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name);
}

/**
 * Everything the assistant needs to extend an installed haunt rather than
 * duplicate it: its id, the ids of its venues and vocabulary, and the ids
 * already given to the requested years and what is in them. A pack that
 * reuses these corrects and adds to the archive; one that doesn't creates
 * a second copy of every record.
 */
export function existingHauntContext(
  state: PackState,
  hauntId: string,
  years: number[],
): ExistingHauntContext | null {
  const haunt = state.haunts.get(hauntId);
  if (!haunt) {
    return null;
  }
  const wantedYears = new Set(years);

  const seasons = [...state.seasons.values()]
    .filter((row) => row.haunt_id === hauntId && wantedYears.has(Number(row.calendar_year)))
    .map((row) => ({
      id: String(row.id),
      calendarYear: Number(row.calendar_year),
      name: String(row.name),
    }))
    .sort((a, b) => a.calendarYear - b.calendarYear || a.name.localeCompare(b.name));
  const seasonIds = new Set(seasons.map((season) => season.id));
  const seasonOrder = new Map(seasons.map((season, index) => [season.id, index]));

  return {
    hauntId,
    name: String(haunt.name),
    venues: [...state.venues.values()]
      .filter((row) => row.haunt_id === hauntId)
      .map((row) => ({ id: String(row.id), name: String(row.name) }))
      .sort(byName),
    experienceTypes: [...state.experienceTypes.values()]
      .filter((row) => row.haunt_id === hauntId)
      .map((row) => ({
        id: String(row.id),
        category: fromStoredCategory(String(row.category)),
        labelOne: String(row.label_one),
      })),
    seasons,
    experiences: [...state.attractions.values()]
      .filter((row) => seasonIds.has(String(row.event_year_id)))
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        seasonId: String(row.event_year_id),
      }))
      .sort(
        (a, b) =>
          (seasonOrder.get(a.seasonId) ?? 0) - (seasonOrder.get(b.seasonId) ?? 0) ||
          a.name.localeCompare(b.name),
      ),
  };
}

export interface ResearchRequest {
  hauntName: string;
  years: number[];
  notes?: string;
  /** Set when the haunt is already installed; the prompt then insists on its ids. */
  existing?: ExistingHauntContext | null;
  /** Stamped into the suggested pack version. Injected so tests are stable. */
  today?: Date;
}

function existingSection(existing: ExistingHauntContext): string[] {
  const lines = [
    "## This haunt is already in the archive",
    "",
    `Haunt Ranker already holds ${existing.name}. The pack must extend that record, not create a ` +
      "second one, so it must reuse these ids exactly wherever it describes the same thing:",
    "",
    `- \`haunt.id\`: \`${existing.hauntId}\``,
  ];
  if (existing.venues.length > 0) {
    lines.push("- Venues:");
    for (const venue of existing.venues) {
      lines.push(`  - \`${venue.id}\` — ${venue.name}`);
    }
  }
  if (existing.experienceTypes.length > 0) {
    lines.push("- Experience types:");
    for (const type of existing.experienceTypes) {
      lines.push(`  - \`${type.id}\` — ${type.labelOne} (category \`${type.category}\`)`);
    }
  }
  if (existing.seasons.length > 0) {
    lines.push("- Seasons already recorded for the requested years:");
    for (const season of existing.seasons) {
      lines.push(`  - \`${season.id}\` — ${season.name} (${season.calendarYear})`);
    }
  }
  if (existing.experiences.length > 0) {
    lines.push("- Experiences already recorded in those seasons:");
    for (const experience of existing.experiences) {
      lines.push(`  - \`${experience.id}\` — ${experience.name} (in \`${experience.seasonId}\`)`);
    }
  }
  lines.push(
    "",
    "Include each of these venues and experience types in the pack's `venues` and " +
      "`experienceTypes` lists with the same id. Any season or experience listed above keeps its " +
      "id even if you would have named it differently; a new id makes a duplicate. Use new ids " +
      "only for things not listed here.",
  );
  return lines;
}

/**
 * The complete, clipboard-ready brief.
 *
 * Built from `currentPackFormat()`, so it always describes the schema this
 * build reads: when the schema moves on, so does the prompt, with nothing
 * here to edit.
 */
export function buildResearchPrompt(
  request: ResearchRequest,
  format: PackFormat = currentPackFormat(),
): string {
  const name = request.hauntName.trim();
  const yearsLabel = describeYears(request.years);
  const hauntId = request.existing?.hauntId ?? (suggestHauntId(name) || "your-haunt-id");
  const today = (request.today ?? new Date()).toISOString().slice(0, 10);
  const packId = `${hauntId}-${request.years[0]}${
    request.years.length > 1 ? `-${request.years[request.years.length - 1]}` : ""
  }`;
  const notes = request.notes?.trim();

  const lines: string[] = [
    `# Research task: ${name}, ${yearsLabel}`,
    "",
    `Research the Halloween event **${name}** for ${
      request.years.length === 1 ? "the year" : "the years"
    } **${yearsLabel}**, and return the result as a Haunt Pack: a single JSON document in the ` +
      `format \`${format.schema}\`, which the Haunt Ranker app imports directly. The format is ` +
      "described in full at the end of this message.",
    "",
    "For each requested year the event ran, find: the season's official name and its first and " +
      "last dates; every maze, house or other walk-through; every scare zone; every show; and, for " +
      "each, its name as billed, what kind it is, which venue it ran at, whether it was original or " +
      "based on a licensed property (and which), and a short factual summary. Add anything else " +
      "the format has room for only where a source supports it.",
  ];

  if (notes) {
    lines.push("", "Notes from the person asking:", "", ...notes.split("\n").map((l) => `> ${l}`));
  }

  lines.push(
    "",
    "## Sourcing",
    "",
    "- Use reliable sources: the event's official website and press releases first, then " +
      "established news outlets and trade press. Fan wikis, forums and social posts may point you " +
      "somewhere, but confirm what they say elsewhere before relying on it.",
    "- Cite as you go. Every source you rely on goes in `sources` once, with its real title and " +
      "URL, and every season and every experience lists the sources behind it in `sourceIds`.",
    '- Only cite pages you actually consulted. Never construct, guess or "reconstruct" a URL, and ' +
      "never cite a source for something it doesn't say.",
    "- If you cannot browse the web, do not write a pack from memory. Say so in one sentence " +
      "instead of returning JSON.",
    "",
    "## Never invent missing facts",
    "",
    "- If something can't be established from a source, leave the field out. An empty field is " +
      "correct; a plausible guess is a wrong fact that looks like a right one.",
    "- In particular, never guess dates, debut years, franchise names, characters, venues or " +
      "locations, and never infer that an experience returned from a previous year because it " +
      "has the same name.",
    "- Write summaries and descriptions in your own words, from what the sources say. Don't copy " +
      "marketing copy verbatim, and don't embellish.",
    "- Record what you couldn't confirm: in the season's `sourceNotes`, and for the pack as a " +
      "whole in `pack.notes`. If the event didn't run in a requested year, leave that season out " +
      "and say so in `pack.notes`.",
    "",
    "## Media provenance",
    "",
    "- Include media (posters, logos, key art) only where you found the specific image published " +
      "at a public URL. Never invent an image URL, and never point at a search result or a page " +
      "that merely mentions the image.",
    "- Each media entry needs `attribution` (who made or owns it), `sourceId` (the entry in " +
      "`sources` where you found it), and `licenseNotes` saying what is known about its use — " +
      "for promotional material, usually that it is referenced, not redistributed.",
    '- Set `distribution` to `"reference"` for an image hosted by its owner (the event, the park, ' +
      'or its official press site), and to `"unclear"` for a copy hosted anywhere else. Only the ' +
      'archive\'s maintainer can clear an asset as `"bundled"`.',
    "- Record an event map as `map`, never as key art.",
    "- If you're unsure about an image, leave it out. Media is optional; accuracy is not.",
    "",
    "## Stable ids",
    "",
    "Every record has an `id` that identifies it permanently, and the app uses it to correct a " +
      "record on a later import instead of duplicating it. So:",
    "",
    "- Ids are lowercase letters, digits, hyphens and colons only — never display names, never " +
      "spaces or apostrophes.",
    `- Namespace everything under the haunt id \`${hauntId}\`, following these patterns:`,
    `  - season: \`${hauntId}:<year>\``,
    `  - experience type: \`${hauntId}:type:<word>\` (e.g. \`${hauntId}:type:maze\`)`,
    `  - venue: \`${hauntId}:<venue-name>\``,
    `  - experience: \`${hauntId}:<year>:<type word>:<name>\``,
    `  - source: \`${hauntId}:source:<short-description>\``,
    `  - media: \`${hauntId}:<year>:media:<short-description>\``,
    "  - character: `<experience id>:character:<name>`",
    "- Build the name part from the name as first billed: lowercase, apostrophes dropped, " +
      "everything else that isn't a letter or digit replaced with a hyphen.",
    "- Every id is unique across the whole pack. A maze that ran in two requested years is two " +
      "experiences, one per season, each with its own id.",
  );

  if (request.existing) {
    lines.push("", ...existingSection(request.existing));
  }

  lines.push(
    "",
    "## What to return",
    "",
    "- Exactly one fenced code block tagged `json`, containing one JSON object: the complete " +
      "Haunt Pack. Nothing before it, nothing after it.",
    "- Strict JSON: double-quoted keys and strings, no comments, no trailing commas, no " +
      'placeholders, no "…" standing in for records you left out.',
    `- \`schema\` is exactly \`"${format.schema}"\`.`,
    `- \`pack.id\` is \`"${packId}"\`, \`pack.version\` is \`"${today.replaceAll("-", ".")}"\`, ` +
      "and `pack.generatedAt` is the current time in ISO 8601.",
    "- `pack.provenance` says the pack was researched by an AI assistant and names the main " +
      "sources; `pack.counts` gives the real number of seasons, experiences, sources and " +
      "experience media in the file.",
    "- If the result would be too long for one reply, return fewer years completely rather than " +
      "every year partially, and say in `pack.notes` which years are missing.",
    "",
    "---",
    "",
    renderPackFormat(format),
  );

  return lines.join("\n");
}
