import { describe, expect, it } from "vitest";
import { formatScore } from "./formatScore";

describe("formatScore", () => {
  it.each([
    [0, "0.0"],
    [0.5, "0.5"],
    [4, "4.0"],
    [5, "5.0"],
    [12.5, "12.5"],
    [15, "15.0"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatScore(value)).toBe(expected);
  });
});
