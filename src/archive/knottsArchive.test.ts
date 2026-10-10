// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readDataset } from "./validateDataset";

const FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "data",
  "knotts-archive.json",
);

/**
 * Knott's Scary Farm's archive is the canonical maze *debut* archive for
 * 2021–2026: twelve mazes, each one record. These hold the shipped file to
 * that definition so an edit can't quietly turn it back into yearly lineups.
 */
describe("data/knotts-archive.json", () => {
  const result = readDataset(readFileSync(FILE, "utf8"));
  if (!result.ok) {
    throw new Error(result.errors.join("\n"));
  }
  const { dataset } = result;
  const seasonYear = new Map(dataset.events.map((event) => [event.id, event.calendarYear]));

  it("holds exactly the twelve mazes that debuted from 2021 to 2026", () => {
    const debuts: Record<number, string[]> = {};
    for (const maze of dataset.attractions) {
      (debuts[maze.debutYear ?? 0] ??= []).push(maze.name);
    }
    expect(debuts).toEqual({
      2021: ["Mesmer: Sideshow of the Mind"],
      2022: ["Bloodline 1842", "The Grimoire"],
      2023: ["Cinema Slasher", "Room 13", "The Chilling Chambers"],
      2024: ["Eight Fingers Nine: The Boogeyman", "Widows"],
      2025: ["Mary – The Haunting of Worth Home", "The Zoo"],
      2026: ["Inked", "Unearthed"],
    });
  });

  it("files each maze under its debut season, with later seasons as appearances", () => {
    for (const maze of dataset.attractions) {
      expect(seasonYear.get(maze.eventId), maze.name).toBe(maze.debutYear);
      for (const season of maze.appearances ?? []) {
        expect(seasonYear.get(season)!, maze.name).toBeGreaterThan(maze.debutYear!);
      }
    }
    const mesmer = dataset.attractions.find((maze) => maze.name.startsWith("Mesmer"))!;
    expect([mesmer.eventId, ...(mesmer.appearances ?? [])].map((id) => seasonYear.get(id))).toEqual(
      [2021, 2022, 2023, 2024, 2025],
    );
  });

  it("holds Knott's seasons and mazes only — no scare zones, no other haunt", () => {
    expect(dataset.events.every((event) => event.hauntId === "knotts-scary-farm")).toBe(true);
    expect(dataset.attractions.every((maze) => maze.type === "house")).toBe(true);
    expect(dataset.attractions.map((maze) => maze.name)).not.toContain("The Gore-ing '20s");
    expect(dataset.attractions.map((maze) => maze.name)).not.toContain("The Gauntlet");
  });

  it("keeps the ids ratings are already stored under", () => {
    const ids = dataset.attractions.map((maze) => maze.id);
    for (const rated of ["cinema-slasher", "inked", "unearthed"]) {
      expect(ids.some((id) => id.endsWith(`:maze:${rated}`))).toBe(true);
    }
    expect(ids.every((id) => id.startsWith("knotts-scary-farm:20"))).toBe(true);
  });

  it("says what it covers", () => {
    expect(dataset.notes).toMatch(/2021 to 2026.*incomplete/);
  });
});
