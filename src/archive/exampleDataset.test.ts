// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readDataset } from "./validateDataset";

const EXAMPLE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "docs",
  "examples",
  "archive-dataset.example.json",
);

/**
 * The documented example is the first thing anyone assembling real data will
 * copy. If it drifts out of step with the validator, they find out by having
 * their own file rejected for reasons the documentation doesn't mention.
 */
describe("the documented example dataset", () => {
  it("is a valid dataset", () => {
    const result = readDataset(readFileSync(EXAMPLE, "utf8"));

    expect(result.ok, result.ok ? "" : result.errors.join("\n")).toBe(true);
  });

  it("shows off the parts of the format that are easy to get wrong", () => {
    const result = readDataset(readFileSync(EXAMPLE, "utf8"));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const { attractions } = result.dataset;
    // One record at both parks — a shared appearance.
    expect(attractions.some((attraction) => attraction.parks.length === 2)).toBe(true);
    // A separate record for a substantially different version, linked back.
    expect(attractions.some((attraction) => attraction.variantName)).toBe(true);
    expect(
      attractions.some((attraction) =>
        attraction.related?.some((relation) => relation.type === "previous_version"),
      ),
    ).toBe(true);
    // Both kinds of IP, and a rename in flight.
    expect(attractions.some((attraction) => attraction.ip?.type === "licensed")).toBe(true);
    expect(attractions.some((attraction) => attraction.previousIds?.length)).toBe(true);
  });
});
