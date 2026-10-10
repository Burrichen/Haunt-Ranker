// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hauntTheme } from "../models/hauntTheme";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS = readFileSync(join(SRC, "styles", "tokens.css"), "utf8");

/** Every token a component may use to follow the haunt theme. */
const SEMANTIC_TOKENS = [
  "--accent",
  "--accent-strong",
  "--accent-subtle",
  "--on-accent",
  "--shadow-glow-accent",
  "--accent-2",
  "--accent-2-strong",
  "--accent-2-subtle",
  "--shadow-glow-accent-2",
  "--series",
  "--focus",
  "--selection",
  "--atmosphere-1",
  "--atmosphere-2",
];

function themeBlock(selector: string): string {
  const start = TOKENS.indexOf(selector);
  expect(start, `${selector} block`).toBeGreaterThanOrEqual(0);
  return TOKENS.slice(start, TOKENS.indexOf("}", start));
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe("haunt themes", () => {
  it("maps each haunt to its theme, and anything else to the neutral shell", () => {
    expect(hauntTheme("hhn")).toBe("hhn");
    expect(hauntTheme("knotts-scary-farm")).toBe("knotts");
    expect(hauntTheme(null)).toBe("all");
    expect(hauntTheme(undefined)).toBe("all");
    expect(hauntTheme("somewhere-else")).toBe("all");
  });

  it.each([
    [':root,\n[data-haunt-theme="hhn"]'],
    ['[data-haunt-theme="knotts"]'],
    ['[data-haunt-theme="all"]'],
  ])("%s defines every semantic token", (selector) => {
    const block = themeBlock(selector);
    for (const token of SEMANTIC_TOKENS) {
      expect(block, `${selector} ${token}`).toContain(`${token}:`);
    }
  });

  it("gives Knott's plum with a ghost-green secondary, and keeps HHN orange", () => {
    expect(themeBlock('[data-haunt-theme="knotts"]')).toContain("--accent: var(--color-plum)");
    expect(themeBlock('[data-haunt-theme="knotts"]')).toContain("--accent-2: var(--color-ghost)");
    expect(themeBlock(':root,\n[data-haunt-theme="hhn"]')).toContain(
      "--accent: var(--color-orange)",
    );
  });

  it("keeps haunt colours in the tokens: no component names a palette colour", () => {
    const offenders = filesUnder(SRC)
      .filter((path) => /\.(css|tsx?)$/.test(path) && !/\.test\./.test(path))
      .filter((path) => !path.endsWith(join("styles", "tokens.css")))
      // The one place a chart picks each haunt's own series colour.
      .filter((path) => !path.endsWith(join("statistics", "chartTheme.ts")))
      .filter((path) =>
        /var\(--color-(orange|purple|plum|ghost|brass|green|blue)/.test(readFileSync(path, "utf8")),
      )
      .map((path) => relative(SRC, path));
    expect(offenders).toEqual([]);
  });
});
