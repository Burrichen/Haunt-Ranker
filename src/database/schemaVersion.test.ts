// @vitest-environment node
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "./schemaVersion";

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "src-tauri",
  "migrations",
);

describe("SCHEMA_VERSION", () => {
  it("matches the highest migration on disk", () => {
    const versions = readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith(".sql"))
      .map((name) => Number.parseInt(name.slice(0, 4), 10));

    expect(versions.length).toBeGreaterThan(0);
    expect(SCHEMA_VERSION).toBe(Math.max(...versions));
  });
});
