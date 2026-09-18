import { describe, expect, it } from "vitest";
import { pickRandomSample } from "./sample";

describe("pickRandomSample", () => {
  it("returns the requested count without duplicates", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const picked = pickRandomSample(items, 4);

    expect(picked).toHaveLength(4);
    expect(new Set(picked).size).toBe(4);
    picked.forEach((item) => expect(items).toContain(item));
  });

  it("caps at the number of available items instead of throwing", () => {
    const items = ["a", "b", "c"];
    const picked = pickRandomSample(items, 10);

    expect(picked).toHaveLength(3);
    expect(picked.slice().sort()).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(pickRandomSample([], 5)).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const items = [1, 2, 3];
    pickRandomSample(items, 2);
    expect(items).toEqual([1, 2, 3]);
  });
});
