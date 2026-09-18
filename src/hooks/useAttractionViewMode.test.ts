import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAttractionViewMode } from "./useAttractionViewMode";

const STORAGE_KEY = "haunt-ranker:attraction-view-mode";

describe("useAttractionViewMode", () => {
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("defaults to card view when nothing is stored", () => {
    const { result } = renderHook(() => useAttractionViewMode());
    expect(result.current[0]).toBe("card");
  });

  it("restores a previously stored preference", () => {
    window.localStorage.setItem(STORAGE_KEY, "compact");
    const { result } = renderHook(() => useAttractionViewMode());
    expect(result.current[0]).toBe("compact");
  });

  it("persists a change so the next hook instance sees it", () => {
    const { result } = renderHook(() => useAttractionViewMode());

    act(() => {
      result.current[1]("compact");
    });

    expect(result.current[0]).toBe("compact");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("compact");

    const { result: second } = renderHook(() => useAttractionViewMode());
    expect(second.current[0]).toBe("compact");
  });
});
