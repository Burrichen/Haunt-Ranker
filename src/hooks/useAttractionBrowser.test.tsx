import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SqlExecutor } from "../database/types";
import type { HauntScope } from "../models/haunt";
import { createTestDatabase } from "../test/createTestDatabase";
import { useAttractionBrowser } from "./useAttractionBrowser";
import { HauntScopeContext } from "./useHauntScope";

const database = vi.hoisted(() => ({ current: null as SqlExecutor | null }));

vi.mock("../database/client", () => ({
  DATABASE_URL: "sqlite:test.db",
  getDatabase: () => Promise.resolve(database.current),
}));

function wrapperFor(scope: HauntScope) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={["/houses?sort=manual"]}>
        <HauntScopeContext.Provider
          value={{
            scope,
            setScope: () => {},
            defaultScope: scope,
            setDefaultScope: () => {},
            hauntId: scope === "all" ? null : scope,
            isAllHaunts: scope === "all",
          }}
        >
          {children}
        </HauntScopeContext.Provider>
      </MemoryRouter>
    );
  };
}

async function rank(scope: string, ids: string[]) {
  for (const [position, id] of ids.entries()) {
    await database.current!.execute(
      "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES (?, ?, ?, ?)",
      [`${scope}-${id}`, scope, id, position],
    );
  }
}

/**
 * The browser's "Personal Ranking" sort is documented to read the same list
 * the Rankings page shows — so it has to be the list for the haunt in view,
 * not the All Haunts one, or the two pages disagree about the same person's
 * order.
 */
describe("useAttractionBrowser's Personal Ranking", () => {
  beforeEach(async () => {
    database.current = createTestDatabase();
    const db = database.current;
    await db.execute(
      "INSERT INTO event_years (id, haunt_id, calendar_year, name) VALUES ('hhn-2024', 'hhn', 2024, 'HHN 2024')",
    );
    for (const id of ["a", "b", "c"]) {
      await db.execute(
        "INSERT INTO attractions (id, event_year_id, attraction_type, name, slug) VALUES (?, 'hhn-2024', 'house', ?, ?)",
        [id, id.toUpperCase(), id],
      );
    }
    await rank("houses:all", ["a", "b", "c"]);
    await rank("hhn:houses:all", ["c", "b", "a"]);
  });

  it("follows HHN's own list when HHN is in view", async () => {
    const { result } = renderHook(() => useAttractionBrowser("house"), {
      wrapper: wrapperFor("hhn"),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows.map((row) => row.attraction.id)).toEqual(["c", "b", "a"]);
  });

  it("follows the All Haunts list under All Haunts", async () => {
    const { result } = renderHook(() => useAttractionBrowser("house"), {
      wrapper: wrapperFor("all"),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows.map((row) => row.attraction.id)).toEqual(["a", "b", "c"]);
  });
});
