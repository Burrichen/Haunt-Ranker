// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "../database/types";
import { HAUNT_ACCENTS } from "../models/haunt";
import { VENUE_ICONS } from "../models/park";
import { createArchiveImportRepository } from "../repositories/archiveImportRepository";
import { createHauntPackRepository } from "../repositories/hauntPackRepository";
import { createTestDatabase } from "../test/createTestDatabase";
import { HAUNT_PACK_SCHEMA } from "./hauntPack";
import { applyPackImport, PackImportError, preparePackImport } from "./importHauntPack";
import { currentPackFormat, renderPackFormat, type PackFormat } from "./packFormat";
import {
  EXPERIENCE_CATEGORIES,
  IP_TYPES,
  MEDIA_KINDS,
  PACK_DISTRIBUTIONS,
  RELATION_TYPES,
  SOURCE_TYPES,
} from "./packVocabulary";
import {
  buildResearchPrompt,
  describeYears,
  existingHauntContext,
  matchInstalledHaunt,
  parseYears,
  suggestHauntId,
} from "./researchPrompt";
import { readHauntPack, unwrapCodeFence, validateHauntPack } from "./validateHauntPack";

const FIXTURE_TEXT = readFileSync(
  join(import.meta.dirname, "..", "test", "fixtures", "moonlight-fright-festival.hauntpack.json"),
  "utf8",
);

const TODAY = new Date("2026-09-28T09:00:00.000Z");

/** Every object a section path such as `experiences[].media[]` names, in the example. */
function entriesAt(root: unknown, path: string): Array<Record<string, unknown>> {
  let current: unknown[] = [root];
  if (path === "") {
    return current as Array<Record<string, unknown>>;
  }
  for (const segment of path.split(".")) {
    const isList = segment.endsWith("[]");
    const key = isList ? segment.slice(0, -2) : segment;
    current = current.flatMap((entry) => {
      const value = (entry as Record<string, unknown>)[key];
      return isList ? ((value as unknown[] | undefined) ?? []) : value === undefined ? [] : [value];
    });
  }
  return current as Array<Record<string, unknown>>;
}

describe("the pack format description", () => {
  const format = currentPackFormat();

  it("describes the schema this build reads", () => {
    expect(format.schema).toBe(HAUNT_PACK_SCHEMA);
  });

  it("has an example the validator accepts without a single warning", () => {
    const result = validateHauntPack(structuredClone(format.example));

    expect(result.ok ? result.warnings : result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  // The description and the validator are two things that must say the same.
  // Each field the description calls required is removed in turn, and the
  // validator has to refuse the pack for it.
  const required = format.sections.flatMap((section) =>
    section.fields
      .filter((field) => field.required)
      .map((field) => ({ section: section.path, field: field.name })),
  );

  it.each(required)("is right that $section.$field is required", ({ section, field }) => {
    const pack = structuredClone(format.example);
    const [entry] = entriesAt(pack, section);
    expect(entry, `the example needs a ${section || "top level"} entry to test`).toBeDefined();
    delete entry[field];

    expect(validateHauntPack(pack).ok).toBe(false);
  });

  it("lists every value the validator allows, and nothing it doesn't", () => {
    const listed = format.sections.flatMap((section) =>
      section.fields.filter((field) => field.values).map((field) => field.values),
    );

    for (const allowed of [
      EXPERIENCE_CATEGORIES,
      IP_TYPES,
      RELATION_TYPES,
      MEDIA_KINDS,
      PACK_DISTRIBUTIONS,
      SOURCE_TYPES,
      HAUNT_ACCENTS,
      VENUE_ICONS,
    ]) {
      expect(listed).toContainEqual(allowed);
    }
    expect(format.sections.flatMap((s) => s.fields.flatMap((f) => f.values ?? []))).not.toContain(
      "local",
    );
  });

  it("renders the schema id, every section and the example", () => {
    const text = renderPackFormat(format);

    expect(text).toContain(HAUNT_PACK_SCHEMA);
    for (const section of format.sections) {
      expect(text).toContain(`## ${section.title}`);
    }
    const example = /```json\n([\s\S]*)\n```/.exec(text)?.[1];
    expect(JSON.parse(example!)).toEqual(format.example);
  });
});

describe("parseYears", () => {
  it.each([
    ["2025", [2025]],
    ["2024–2026", [2024, 2025, 2026]],
    ["2024-2026", [2024, 2025, 2026]],
    ["2024 — 2026", [2024, 2025, 2026]],
    ["2024 to 2026", [2024, 2025, 2026]],
    ["2019, 2021, 2023", [2019, 2021, 2023]],
    ["2023 2019 2023", [2019, 2023]],
    ["2010-2011, 2015", [2010, 2011, 2015]],
  ])("reads %s", (input, years) => {
    expect(parseYears(input)).toEqual({ ok: true, years });
  });

  it.each([
    ["", /Enter a year/],
    ["last year", /isn't a year/],
    ["2026–2024", /backwards/],
    ["1850", /plausible/],
    ["2000–2030", /more than 15 years/],
    ["24", /isn't a year/],
  ])("refuses %j", (input, error) => {
    const result = parseYears(input);
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toMatch(error);
  });

  it("describes runs as ranges and gaps as lists", () => {
    expect(describeYears([2024, 2025, 2026])).toBe("2024–2026");
    expect(describeYears([2019, 2021])).toBe("2019, 2021");
    expect(describeYears([2025])).toBe("2025");
  });
});

describe("suggestHauntId", () => {
  it("makes the id a pack would use from a display name", () => {
    expect(suggestHauntId("Knott's Scary Farm")).toBe("knotts-scary-farm");
    expect(suggestHauntId("Knott’s  Scary Farm!")).toBe("knotts-scary-farm");
    expect(suggestHauntId("Fright Fest — Six Flags")).toBe("fright-fest-six-flags");
    expect(suggestHauntId("Épouvante Nocturne")).toBe("epouvante-nocturne");
  });
});

describe("the research prompt", () => {
  const prompt = buildResearchPrompt({
    hauntName: "Knott's Scary Farm",
    years: [2024, 2025, 2026],
    notes: "Mazes only if the zones are hard to confirm.\nPrefer the official site.",
    today: TODAY,
  });

  it("names the haunt and the years", () => {
    expect(prompt).toContain("Knott's Scary Farm");
    expect(prompt).toContain("2024–2026");
    expect(prompt).toContain("> Mazes only if the zones are hard to confirm.");
    expect(prompt).toContain("> Prefer the official site.");
  });

  it("uses the installed schema version", () => {
    expect(prompt).toContain(`\`schema\` is exactly \`"${HAUNT_PACK_SCHEMA}"\``);
  });

  it("contains the whole format: every required field and every allowed experience type", () => {
    const format = currentPackFormat();
    for (const section of format.sections) {
      for (const field of section.fields.filter((f) => f.required)) {
        expect(prompt).toContain(`- \`${field.name}\` — ${field.type}, required.`);
      }
    }
    for (const category of EXPERIENCE_CATEGORIES) {
      expect(prompt).toContain(`\`${category}\``);
    }
  });

  it("insists on sourcing and forbids inventing facts", () => {
    expect(prompt).toMatch(/## Sourcing/);
    expect(prompt).toMatch(/official website and press releases/);
    expect(prompt).toMatch(/Only cite pages you actually consulted/);
    expect(prompt).toMatch(/## Never invent missing facts/);
    expect(prompt).toMatch(/leave the field out/);
  });

  it("sets out media provenance", () => {
    expect(prompt).toMatch(/## Media provenance/);
    expect(prompt).toMatch(/Never invent an image URL/);
    expect(prompt).toContain("`attribution`");
    expect(prompt).toContain('`distribution` to `"reference"`');
  });

  it("sets out stable ids, namespaced under the haunt", () => {
    expect(prompt).toMatch(/## Stable ids/);
    expect(prompt).toContain("`knotts-scary-farm:<year>`");
    expect(prompt).toContain("`knotts-scary-farm:type:<word>`");
    expect(prompt).toContain('`pack.id` is `"knotts-scary-farm-2024-2026"`');
    expect(prompt).toContain('`pack.version` is `"2026.09.28"`');
  });

  it("asks for one strict JSON object in one json code block", () => {
    expect(prompt).toMatch(/Exactly one fenced code block tagged `json`/);
    expect(prompt).toMatch(/no comments, no trailing commas/);
  });

  // The prompt is written from the format description, never from a copy of
  // it: describe a different schema and the prompt teaches that one.
  it("follows the format it is given, so a new schema needs no prompt edit", () => {
    // A stand-in for a future description: the current one, rewritten to v2.
    const next = JSON.parse(
      JSON.stringify(currentPackFormat()).replaceAll(
        HAUNT_PACK_SCHEMA,
        "haunt-ranker.haunt-pack/v2",
      ),
    ) as PackFormat;

    const text = buildResearchPrompt({ hauntName: "Somewhere", years: [2026] }, next);

    expect(text).toContain('`schema` is exactly `"haunt-ranker.haunt-pack/v2"`');
    expect(text).not.toContain(HAUNT_PACK_SCHEMA);
  });

  it("has no schema id written into its source", () => {
    for (const file of ["researchPrompt.ts", "../components/admin/AddHaunt.tsx"]) {
      const source = readFileSync(join(import.meta.dirname, file), "utf8");
      expect(source, file).not.toMatch(/haunt-pack\/v\d/);
    }
  });
});

describe("pasted packs", () => {
  it("strips one outer json code fence and nothing else", () => {
    expect(unwrapCodeFence('```json\n{"a": 1}\n```')).toBe('{"a": 1}');
    expect(unwrapCodeFence('  \n```\n{"a": 1}\n```  \n')).toBe('{"a": 1}');
    expect(unwrapCodeFence('```json\r\n{"a": 1}\r\n```')).toBe('{"a": 1}');
    expect(unwrapCodeFence('{"a": 1}')).toBe('{"a": 1}');
  });

  it("leaves anything that isn't exactly one fence alone", () => {
    const withProse = 'Here is your pack:\n```json\n{"a": 1}\n```';
    const twoFences = '```json\n{"a": 1}\n```\n\n```json\n{"b": 2}\n```';
    const unclosed = '```json\n{"a": 1}';

    expect(unwrapCodeFence(withProse)).toBe(withProse);
    expect(unwrapCodeFence(twoFences)).toBe(twoFences);
    expect(unwrapCodeFence(unclosed)).toBe(unclosed);
  });

  it("reads a pack pasted inside a code fence", () => {
    const result = readHauntPack(`\`\`\`json\n${FIXTURE_TEXT.trim()}\n\`\`\``);

    expect(result.ok).toBe(true);
  });

  it("shows the parser's error, with where it happened", () => {
    const broken = '{\n  "schema": "x",\n  "pack": { "id": "a", },\n}';
    const result = readHauntPack(broken);

    expect(result.ok).toBe(false);
    const [error] = result.ok ? [] : result.errors;
    expect(error).toMatch(/^This isn't valid JSON, so it can't be read as a Haunt Pack\. .+/);
    expect(error).toMatch(/line 3/);
  });

  it("doesn't repair a pack, and says why it failed", () => {
    const withProse = readHauntPack(`Here you go!\n\`\`\`json\n${FIXTURE_TEXT}\n\`\`\``);
    expect(withProse.ok ? [] : withProse.errors).toEqual([
      expect.stringMatching(/isn't valid JSON/),
      expect.stringMatching(/still contains a Markdown code fence/),
    ]);

    const trailingComma = readHauntPack(FIXTURE_TEXT.replace(/\n}\s*$/, ",\n}"));
    expect(trailingComma.ok).toBe(false);
  });
});

describe("prompt → assistant → paste → preview → import", () => {
  let db: SqlExecutor;
  let ids: number;

  beforeEach(() => {
    db = createTestDatabase();
    ids = 0;
  });

  async function readState() {
    return createHauntPackRepository(db).readState();
  }

  it("imports what comes back, and the next prompt carries the ids it created", async () => {
    // 1. A prompt for a haunt this archive has never heard of.
    const before = await readState();
    expect(matchInstalledHaunt(before, "Moonlight Fright Festival")).toBeNull();
    const prompt = buildResearchPrompt({
      hauntName: "Moonlight Fright Festival",
      years: [2026],
      today: TODAY,
    });
    expect(prompt).toContain("`moonlight-fright-festival:<year>`");
    expect(prompt).not.toContain("## This haunt is already in the archive");

    // 2. What an assistant hands back: the pack, in a json code block.
    const reply = `\`\`\`json\n${FIXTURE_TEXT.trim()}\n\`\`\``;

    // 3. Pasted, validated and previewed without writing anything.
    const prepared = preparePackImport(reply, before);
    expect(prepared.pack.schema).toBe(HAUNT_PACK_SCHEMA);
    expect(prepared.preview.isNewHaunt).toBe(true);
    expect(prepared.preview.experiences.created).toBe(4);
    const [{ count: untouched }] = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) AS count FROM haunts WHERE id = 'moonlight-fright-festival'",
    );
    expect(untouched).toBe(0);

    // 4. Imported.
    const packs = createHauntPackRepository(db);
    await applyPackImport(prepared, {
      archive: createArchiveImportRepository(db),
      packs,
      newId: () => `import-${(ids += 1)}`,
    });
    const [{ count }] = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) AS count FROM attractions WHERE source_pack_id = 'moonlight-fright-festival'",
    );
    expect(count).toBe(4);

    // 5. Asking again now hands the assistant the ids already in use.
    const after = await readState();
    const hauntId = matchInstalledHaunt(after, "moonlight fright festival");
    expect(hauntId).toBe("moonlight-fright-festival");
    const existing = existingHauntContext(after, hauntId!, [2026]);
    const again = buildResearchPrompt({
      hauntName: "Moonlight Fright Festival",
      years: [2026],
      existing,
      today: TODAY,
    });
    expect(again).toContain("## This haunt is already in the archive");
    expect(again).toContain("`moonlight-fright-festival:2026` — Moonlight Fright Festival 2026");
    expect(again).toContain("`moonlight-fright-festival:2026:trail:hollow-road` — Hollow Road");
    expect(again).toContain("`moonlight-fright-festival:type:trail` — Trail (category `house`)");
  });

  it("refuses a pasted reply that isn't a pack, and writes nothing", async () => {
    const state = await readState();

    expect(() =>
      preparePackImport("I couldn't browse the web, so I can't research this.", state),
    ).toThrow(PackImportError);
  });

  it("finds a seeded haunt by name however it is typed", async () => {
    const state = await readState();

    expect(matchInstalledHaunt(state, "Knott’s Scary Farm")).toBe("knotts-scary-farm");
    expect(matchInstalledHaunt(state, "knotts")).toBe("knotts-scary-farm");
    expect(matchInstalledHaunt(state, "HHN")).toBe("hhn");

    const context = existingHauntContext(state, "knotts-scary-farm", [2024, 2025, 2026]);
    expect(context?.venues).toEqual([{ id: "knotts-berry-farm", name: "Knott's Berry Farm" }]);
    expect(context?.experienceTypes.map((type) => type.id)).toContain(
      "knotts-scary-farm:type:maze",
    );
  });
});
