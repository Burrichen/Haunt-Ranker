import { describe, expect, it } from "vitest";
import { formatDisplayDate } from "./formatDate";

describe("formatDisplayDate", () => {
  it("returns null for null input", () => {
    expect(formatDisplayDate(null)).toBeNull();
  });

  it("formats a valid ISO date", () => {
    expect(formatDisplayDate("2024-09-12")).toMatch(/Sep/);
    expect(formatDisplayDate("2024-09-12")).toMatch(/2024/);
  });

  it("falls back to the raw string for values that don't parse as a date", () => {
    expect(formatDisplayDate("sometime in the fall")).toBe("sometime in the fall");
  });
});
