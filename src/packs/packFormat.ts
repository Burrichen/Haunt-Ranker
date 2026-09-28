import { HAUNT_ACCENTS } from "../models/haunt";
import { VENUE_ICONS } from "../models/park";
import { HAUNT_PACK_SCHEMA, type HauntPack } from "./hauntPack";
import {
  EXPERIENCE_CATEGORIES,
  IP_TYPES,
  MEDIA_KINDS,
  PACK_DISTRIBUTIONS,
  RELATION_TYPES,
  SOURCE_TYPES,
} from "./packVocabulary";

/**
 * The Haunt Pack format, described for a reader rather than enforced.
 *
 * The validator is what decides whether a pack is acceptable. This is what
 * tells somebody — or an assistant writing one — what acceptable looks
 * like, and it is the only place that says so: the research prompt and the
 * "View Haunt Pack Format" panel both render from it. The tests hold the
 * two together, by removing each field this calls required from the
 * example and checking the validator then refuses it.
 *
 * There is one description per schema id. When the schema this build
 * writes moves on, `currentPackFormat` refuses to answer until the new
 * version has been described here, so a prompt can never quietly go on
 * teaching the old format.
 */

export interface PackFieldSpec {
  name: string;
  /** In words: "text", "id", "whole number", "list of source ids"… */
  type: string;
  required?: boolean;
  description: string;
  /** The closed set the value is chosen from, where there is one. */
  values?: readonly string[];
}

export interface PackSectionSpec {
  /**
   * Where these fields sit, in the pack: `""` for the top level, `haunt`,
   * `experiences[]`, `experiences[].media[]`. `[]` means each entry of a list.
   */
  path: string;
  title: string;
  description: string;
  fields: PackFieldSpec[];
}

export interface PackFormat {
  schema: string;
  sections: PackSectionSpec[];
  /** A small, complete, valid pack, shown whole so the shape is unmistakable. */
  example: HauntPack;
}

const DATE_RANGE = "object: { start, end }, each an ISO date (YYYY-MM-DD) or null";

const MEDIA_FIELDS: PackFieldSpec[] = [
  { name: "id", type: "id", required: true, description: "Stable id for this media entry." },
  { name: "kind", type: "text", required: true, description: "What it is.", values: MEDIA_KINDS },
  {
    name: "url",
    type: "text (URL)",
    required: true,
    description: "Where the image is published. Never a local file path.",
  },
  { name: "attribution", type: "text", description: "Who made it or owns it." },
  { name: "licenseNotes", type: "text", description: "What is known about how it may be used." },
  {
    name: "sourceId",
    type: "source id",
    description: "The entry in `sources` the image was found through.",
  },
  {
    name: "distribution",
    type: "text",
    description:
      "`reference` (the default): the original, hosted by its owner, recorded but never loaded " +
      "by the app. `unclear`: reuse rights not established, such as a copy on another site. " +
      "`bundled`: the asset has been cleared for redistribution.",
    values: PACK_DISTRIBUTIONS,
  },
];

const WIKI_FIELDS = ["overview", "story", "experience", "development"];

const V1_EXAMPLE: HauntPack = {
  schema: HAUNT_PACK_SCHEMA,
  pack: {
    id: "example-fright-nights-2025",
    version: "2026.1.0",
    generatedAt: "2026-01-15T12:00:00.000Z",
    provenance: "Illustration only. Every record here is invented to show the format.",
    notes:
      "Shows every section once. Parade details for 2025 could not be confirmed and are left out.",
    counts: { seasons: 1, experiences: 2, sources: 2, media: 1 },
  },
  haunt: {
    id: "example-fright-nights",
    name: "Example Fright Nights",
    shortName: "Fright Nights",
    description: "An invented Halloween event, used only to illustrate the Haunt Pack format.",
    venuesLabel: "Example Park",
    accent: "purple",
  },
  experienceTypes: [
    {
      id: "example-fright-nights:type:maze",
      category: "house",
      labelOne: "Maze",
      labelMany: "Mazes",
    },
    {
      id: "example-fright-nights:type:scare-zone",
      category: "scare_zone",
      labelOne: "Scare Zone",
      labelMany: "Scare Zones",
    },
  ],
  venues: [{ id: "example-fright-nights:example-park", name: "Example Park", icon: "tent" }],
  sources: [
    {
      id: "example-fright-nights:source:official-2025",
      type: "official_site",
      title: "Example Fright Nights 2025 — official event page",
      url: "https://example.com/fright-nights/2025",
      publisher: "Example Park",
    },
    {
      id: "example-fright-nights:source:press-2025-lineup",
      type: "article",
      title: "Example Fright Nights reveals its 2025 line-up",
      url: "https://news.example.org/fright-nights-2025-lineup",
      publisher: "Example News",
      publishedAt: "2025-07-10",
    },
  ],
  seasons: [
    {
      id: "example-fright-nights:2025",
      calendarYear: 2025,
      name: "Example Fright Nights 2025",
      sourceNotes: "Line-up from the official page, dates from the press announcement.",
      dates: { start: "2025-09-19", end: "2025-11-01" },
      sourceIds: [
        "example-fright-nights:source:official-2025",
        "example-fright-nights:source:press-2025-lineup",
      ],
    },
  ],
  experiences: [
    {
      id: "example-fright-nights:2025:maze:the-hollow-mill",
      seasonId: "example-fright-nights:2025",
      typeId: "example-fright-nights:type:maze",
      name: "The Hollow Mill",
      venues: ["example-fright-nights:example-park"],
      ip: { type: "original" },
      summary: "A walk-through set in an abandoned flour mill.",
      wiki: { overview: "Guests walk through the ruins of a mill said to grind more than grain." },
      venueWiki: [
        {
          venue: "example-fright-nights:example-park",
          location: "Behind the carousel.",
          sourceIds: ["example-fright-nights:source:official-2025"],
        },
      ],
      characters: [
        {
          id: "example-fright-nights:2025:maze:the-hollow-mill:character:the-miller",
          name: "The Miller",
        },
      ],
      related: [
        {
          experienceId: "example-fright-nights:2025:scare-zone:millers-yard",
          type: "related_concept",
          notes: "The scare zone outside shares the maze's story.",
        },
      ],
      media: [
        {
          id: "example-fright-nights:2025:media:the-hollow-mill-poster",
          kind: "poster",
          url: "https://example.com/fright-nights/2025/the-hollow-mill.jpg",
          attribution: "Example Park",
          licenseNotes: "Promotional poster. Referenced, not redistributed.",
          sourceId: "example-fright-nights:source:official-2025",
          distribution: "reference",
        },
      ],
      sourceIds: ["example-fright-nights:source:official-2025"],
    },
    {
      id: "example-fright-nights:2025:scare-zone:millers-yard",
      seasonId: "example-fright-nights:2025",
      typeId: "example-fright-nights:type:scare-zone",
      name: "Miller's Yard",
      venues: ["example-fright-nights:example-park"],
      ip: { type: "original" },
      sourceIds: ["example-fright-nights:source:press-2025-lineup"],
    },
  ],
};

const V1_FORMAT: PackFormat = {
  schema: HAUNT_PACK_SCHEMA,
  example: V1_EXAMPLE,
  sections: [
    {
      path: "",
      title: "Top level",
      description: "One JSON object describing exactly one haunt.",
      fields: [
        {
          name: "schema",
          type: "text",
          required: true,
          description: `Exactly "${HAUNT_PACK_SCHEMA}".`,
        },
        { name: "pack", type: "object", required: true, description: "About this file." },
        { name: "haunt", type: "object", required: true, description: "The event itself." },
        {
          name: "experienceTypes",
          type: "list (at least one)",
          required: true,
          description: "What this haunt calls each kind of experience.",
        },
        {
          name: "venues",
          type: "list (at least one)",
          required: true,
          description: "Where the haunt runs.",
        },
        {
          name: "seasons",
          type: "list (at least one)",
          required: true,
          description: "One entry per year the event ran.",
        },
        {
          name: "experiences",
          type: "list (at least one)",
          required: true,
          description: "Every maze, house, scare zone and show, filed under the season it ran in.",
        },
        {
          name: "sources",
          type: "list",
          description: "Every source cited anywhere in the pack, written once and cited by id.",
        },
      ],
    },
    {
      path: "pack",
      title: "pack",
      description: "Metadata about the file, not about the event.",
      fields: [
        { name: "id", type: "id", required: true, description: "Stable id for the pack itself." },
        {
          name: "version",
          type: "text",
          required: true,
          description: "The pack's own version, e.g. 2026.1.0.",
        },
        { name: "generatedAt", type: "ISO 8601 timestamp", description: "When the file was made." },
        {
          name: "provenance",
          type: "text",
          description: "Who assembled it, from what. Shown before import.",
        },
        { name: "notes", type: "text", description: "Scope, gaps and caveats of this revision." },
        {
          name: "counts",
          type: "object: { seasons, experiences, sources, media }",
          description:
            "How many of each the pack contains; checked on import to catch a truncated file. " +
            "`media` counts experience media only.",
        },
      ],
    },
    {
      path: "haunt",
      title: "haunt",
      description: "The event. Its id is the namespace every other id sits under.",
      fields: [
        { name: "id", type: "id", required: true, description: "Stable id for the haunt." },
        { name: "name", type: "text", required: true, description: "Full name." },
        {
          name: "shortName",
          type: "text",
          required: true,
          description: 'For tight spaces: "HHN", "Knott\'s".',
        },
        { name: "description", type: "text", description: "A sentence or two about the event." },
        { name: "tagline", type: "text", description: "One short line." },
        {
          name: "venuesLabel",
          type: "text",
          description: 'Where it runs, in plain words: "Knott\'s Berry Farm".',
        },
        {
          name: "accent",
          type: "text",
          description: "The app colour used for it.",
          values: HAUNT_ACCENTS,
        },
        { name: "sortOrder", type: "number", description: "Lower sorts first. Usually omitted." },
      ],
    },
    {
      path: "experienceTypes[]",
      title: "experienceTypes[]",
      description: "The haunt's own words for its kinds of experience.",
      fields: [
        { name: "id", type: "id", required: true, description: "Stable id for the type." },
        {
          name: "category",
          type: "text",
          required: true,
          description:
            "What the app reasons about: `house` is any walk-through (maze, house, trail), " +
            "`scare_zone` an open-air area, `show` a staged performance, `other` anything else.",
          values: EXPERIENCE_CATEGORIES,
        },
        { name: "labelOne", type: "text", required: true, description: 'Singular: "Maze".' },
        { name: "labelMany", type: "text", required: true, description: 'Plural: "Mazes".' },
        { name: "description", type: "text", description: "What the word means at this haunt." },
        { name: "sortOrder", type: "number", description: "Lower sorts first." },
      ],
    },
    {
      path: "venues[]",
      title: "venues[]",
      description: "The places the haunt runs.",
      fields: [
        { name: "id", type: "id", required: true, description: "Stable id for the venue." },
        { name: "name", type: "text", required: true, description: "The venue's name." },
        {
          name: "icon",
          type: "text",
          description: "One of the app's marks.",
          values: VENUE_ICONS,
        },
        { name: "sortOrder", type: "number", description: "Lower sorts first." },
      ],
    },
    {
      path: "seasons[]",
      title: "seasons[]",
      description: "One year of the event.",
      fields: [
        { name: "id", type: "id", required: true, description: "Stable id for the season." },
        {
          name: "previousIds",
          type: "list of ids",
          description: "Ids this season was published under before, if it was ever renamed.",
        },
        { name: "calendarYear", type: "whole number", required: true, description: "e.g. 2025." },
        {
          name: "name",
          type: "text",
          required: true,
          description: "The season's name, e.g. \"Knott's Scary Farm 2025\".",
        },
        { name: "description", type: "text", description: "What set this year apart." },
        {
          name: "sourceNotes",
          type: "text",
          description: "How this season's entry was assembled, and what could not be confirmed.",
        },
        { name: "dates", type: DATE_RANGE, description: "First and last night." },
        { name: "sourceIds", type: "list of source ids", description: "Sources for the season." },
        { name: "media", type: "list of media", description: "Key art, logos, posters." },
      ],
    },
    {
      path: "experiences[]",
      title: "experiences[]",
      description: "One maze, house, zone or show, in one season.",
      fields: [
        { name: "id", type: "id", required: true, description: "Stable id for the experience." },
        {
          name: "previousIds",
          type: "list of ids",
          description: "Ids this record was published under before, if any.",
        },
        {
          name: "seasonId",
          type: "season id",
          required: true,
          description: "The season it ran in.",
        },
        {
          name: "typeId",
          type: "experience type id",
          required: true,
          description: "Which of the haunt's kinds it is.",
        },
        { name: "name", type: "text", required: true, description: "The name as billed." },
        {
          name: "slug",
          type: "id",
          description: "URL segment. Defaults to the id; usually omitted.",
        },
        {
          name: "variantName",
          type: "text",
          description: "What tells it apart from another experience of the same name.",
        },
        {
          name: "venues",
          type: "list of venue ids (at least one)",
          required: true,
          description: "Where it ran. More than one means the same experience ran at each.",
        },
        {
          name: "ip",
          type: "object: { type, franchise }",
          description: "`type` is required inside it; `franchise` names a licensed property.",
          values: IP_TYPES,
        },
        { name: "summary", type: "text", description: "One or two sentences." },
        {
          name: "wiki",
          type: `object: { ${WIKI_FIELDS.join(", ")} }, each text`,
          description: "Long-form sections, each optional.",
        },
        {
          name: "venueWiki",
          type: "list",
          description: "What differed at one venue. Each entry needs `venue` and something to say.",
        },
        { name: "location", type: "text", description: "Where in the venue it was." },
        { name: "dates", type: DATE_RANGE, description: "Only if it ran for part of the season." },
        {
          name: "debutYear",
          type: "whole number",
          description: "The year it genuinely first ran, where a source establishes it.",
        },
        {
          name: "alsoAppearedIn",
          type: "list of season ids",
          description: "Other seasons in this pack it also ran in.",
        },
        { name: "characters", type: "list", description: "Named characters." },
        { name: "related", type: "list", description: "Links to other experiences." },
        { name: "media", type: "list of media", description: "Posters, logos, artwork." },
        { name: "sourceIds", type: "list of source ids", description: "Sources for this record." },
      ],
    },
    {
      path: "experiences[].venueWiki[]",
      title: "experiences[].venueWiki[]",
      description: "What differed at one of the experience's own venues.",
      fields: [
        {
          name: "venue",
          type: "venue id",
          required: true,
          description: "One of this experience's `venues`.",
        },
        ...WIKI_FIELDS.map((name) => ({ name, type: "text", description: `The ${name} here.` })),
        { name: "location", type: "text", description: "Where in this venue it was." },
        { name: "sourceIds", type: "list of source ids", description: "Sources for this venue." },
      ],
    },
    {
      path: "experiences[].characters[]",
      title: "experiences[].characters[]",
      description: "A named character in the experience.",
      fields: [
        { name: "id", type: "id", required: true, description: "Stable id for the character." },
        { name: "name", type: "text", required: true, description: "As credited." },
        { name: "description", type: "text", description: "Who they are." },
      ],
    },
    {
      path: "experiences[].related[]",
      title: "experiences[].related[]",
      description: "A link to another experience, in this pack or already in the archive.",
      fields: [
        {
          name: "experienceId",
          type: "experience id",
          required: true,
          description: "The other experience.",
        },
        {
          name: "type",
          type: "text",
          required: true,
          description: "How they relate.",
          values: RELATION_TYPES,
        },
        { name: "notes", type: "text", description: "Why." },
      ],
    },
    {
      path: "experiences[].media[]",
      title: "media (in seasons[] and experiences[])",
      description:
        "A reference to an image, never the image itself. The same shape wherever it appears.",
      fields: MEDIA_FIELDS,
    },
    {
      path: "sources[]",
      title: "sources[]",
      description: "Where a fact came from.",
      fields: [
        { name: "id", type: "id", required: true, description: "Stable id for the source." },
        {
          name: "type",
          type: "text",
          required: true,
          description: "What kind.",
          values: SOURCE_TYPES,
        },
        { name: "title", type: "text", required: true, description: "Its title, as published." },
        { name: "url", type: "text (URL)", description: "Where it can be read." },
        { name: "publisher", type: "text", description: "Who published it." },
        { name: "publishedAt", type: "ISO date (YYYY-MM-DD)", description: "When." },
        { name: "notes", type: "text", description: "Anything a reader should know about it." },
      ],
    },
  ],
};

/** Every schema this build can describe, by id. */
export const PACK_FORMATS: Readonly<Record<string, PackFormat>> = {
  [V1_FORMAT.schema]: V1_FORMAT,
};

/**
 * The format this build writes and reads, described.
 *
 * Throws rather than falling back to an older description: a research
 * prompt for the wrong schema produces packs this build refuses, which is
 * worse than a build that won't start until the description is written.
 */
export function currentPackFormat(): PackFormat {
  const format = PACK_FORMATS[HAUNT_PACK_SCHEMA];
  if (!format) {
    throw new Error(`No description of Haunt Pack schema "${HAUNT_PACK_SCHEMA}" has been written.`);
  }
  return format;
}

function fieldLine(field: PackFieldSpec): string {
  const need = field.required ? "required" : "optional";
  const values = field.values
    ? ` One of: ${field.values.map((value) => `\`${value}\``).join(", ")}.`
    : "";
  return `- \`${field.name}\` — ${field.type}, ${need}. ${field.description}${values}`;
}

/**
 * The format as Markdown: every section, every field, what it takes, and
 * a complete example. What "Copy Schema" copies and the prompt embeds.
 */
export function renderPackFormat(format: PackFormat = currentPackFormat()): string {
  const lines = [
    `# Haunt Pack format — ${format.schema}`,
    "",
    "A Haunt Pack is one JSON object. Fields marked optional may be left out entirely; " +
      "leave out anything not known rather than filling it in. Text fields may also be null.",
    "",
    "## Ids",
    "",
    "Every `id` is lowercase letters, digits, hyphens and colons, 2–120 characters, starting " +
      "with a letter or digit (pattern `^[a-z0-9][a-z0-9:-]{1,119}$`). Ids are never display " +
      "names, never change once published, and are unique across the whole pack. Everything " +
      "except the pack and the haunt is namespaced under the haunt id: `<haunt id>:…`.",
  ];

  for (const section of format.sections) {
    lines.push("", `## ${section.title}`, "", section.description, "");
    lines.push(...section.fields.map(fieldLine));
  }

  lines.push(
    "",
    "## Example",
    "",
    "An invented haunt, complete and valid:",
    "",
    "```json",
    JSON.stringify(format.example, null, 2),
    "```",
  );

  return lines.join("\n");
}
