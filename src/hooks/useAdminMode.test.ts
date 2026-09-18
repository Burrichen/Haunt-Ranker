import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAdminMode } from "./useAdminMode";

const STORAGE_KEY = "haunt-ranker:admin-mode";

describe("useAdminMode", () => {
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("is off until someone turns it on", () => {
    const { result } = renderHook(() => useAdminMode());
    expect(result.current[0]).toBe(false);
  });

  it("restores a stored preference", () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    const { result } = renderHook(() => useAdminMode());
    expect(result.current[0]).toBe(true);
  });

  it("persists a change so the next launch sees it", () => {
    const { result } = renderHook(() => useAdminMode());

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
    expect(renderHook(() => useAdminMode()).result.current[0]).toBe(true);
  });

  it("can be turned back off", () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    const { result } = renderHook(() => useAdminMode());

    act(() => {
      result.current[1](false);
    });

    expect(result.current[0]).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("false");
  });

  it("treats anything other than a stored 'true' as off", () => {
    // A corrupted or half-written value must never leave editing switched on.
    window.localStorage.setItem(STORAGE_KEY, "yes please");
    expect(renderHook(() => useAdminMode()).result.current[0]).toBe(false);
  });
});
