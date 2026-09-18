// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "../database/types";
import { createTestDatabase } from "../test/createTestDatabase";
import { createSettingsRepository, type SettingsRepository } from "./settingsRepository";

describe("SettingsRepository", () => {
  let db: SqlExecutor;
  let settings: SettingsRepository;

  beforeEach(() => {
    db = createTestDatabase();
    settings = createSettingsRepository(db);
  });

  it("is null for a key that has never been set", async () => {
    await expect(settings.get("ambientEffectsEnabled")).resolves.toBeNull();
  });

  it("round-trips JSON-serializable values of different shapes", async () => {
    await settings.set("ambientEffectsEnabled", false);
    await settings.set("favoriteParkIds", ["hollywood", "orlando"]);
    await settings.set("preferences", { theme: "dark", compact: true });

    await expect(settings.get("ambientEffectsEnabled")).resolves.toBe(false);
    await expect(settings.get("favoriteParkIds")).resolves.toEqual(["hollywood", "orlando"]);
    await expect(settings.get("preferences")).resolves.toEqual({ theme: "dark", compact: true });
  });

  it("set on an existing key updates in place rather than duplicating", async () => {
    await settings.set("ambientEffectsEnabled", true);
    await settings.set("ambientEffectsEnabled", false);

    const rows = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) as count FROM user_settings WHERE key = ?",
      ["ambientEffectsEnabled"],
    );
    expect(rows[0].count).toBe(1);
    await expect(settings.get("ambientEffectsEnabled")).resolves.toBe(false);
  });

  it("lists every stored setting", async () => {
    await settings.set("a", 1);
    await settings.set("b", 2);

    const all = await settings.getAll();
    expect(all.map((setting) => setting.key)).toEqual(["a", "b"]);
  });

  it("deletes a setting", async () => {
    await settings.set("temporary", "value");
    await settings.delete("temporary");

    await expect(settings.get("temporary")).resolves.toBeNull();
  });
});
