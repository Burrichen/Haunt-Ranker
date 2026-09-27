import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HauntScopeProvider } from "../components/layout/HauntScopeProvider";
import { HauntSelector } from "../components/layout/HauntSelector";
import { useHauntLanding } from "../hooks/useHaunts";
import type { EventYear } from "../models/eventYear";
import { PREFERENCE_KEYS } from "../preferences/localPreferences";
import { computeYearStats } from "../utils/years";
import { TestHaunts } from "../test/hauntRegistry";
import { HauntLanding } from "./HauntLanding";

vi.mock("../hooks/useHaunts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../hooks/useHaunts")>()),
  useHauntLanding: vi.fn(),
}));

const mockedUseHauntLanding = vi.mocked(useHauntLanding);

const TIMESTAMPS = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function season(calendarYear: number, hauntId: EventYear["hauntId"] = "hhn"): EventYear {
  return {
    id: `${hauntId}-${calendarYear}`,
    hauntId,
    calendarYear,
    name: `Halloween Horror Nights ${calendarYear}`,
    description: null,
    sourceNotes: null,
    startsOn: null,
    endsOn: null,
    isSample: false,
    ...TIMESTAMPS,
  };
}

function renderLanding(path: string) {
  return render(
    <TestHaunts>
      <MemoryRouter initialEntries={[path]}>
        <HauntScopeProvider>
          <HauntSelector />
          <Routes>
            <Route path="/haunts/:hauntId" element={<HauntLanding />} />
          </Routes>
        </HauntScopeProvider>
      </MemoryRouter>
    </TestHaunts>,
  );
}

describe("HauntLanding", () => {
  beforeEach(() => {
    mockedUseHauntLanding.mockReturnValue({
      isLoading: false,
      error: null,
      summary: {
        hauntId: "hhn",
        attractions: 367,
        seasons: 2,
        walkthroughs: 300,
        scareZones: 67,
        reviewed: 40,
        firstYear: 2025,
        lastYear: 2026,
      },
      seasons: [season(2026), season(2025)],
      stats: computeYearStats([]),
    });
  });

  afterEach(() => {
    window.localStorage.removeItem(PREFERENCE_KEYS.hauntScope);
  });

  it("introduces the haunt and what its archive holds, in its own words", () => {
    renderLanding("/haunts/hhn");

    expect(
      screen.getByRole("heading", { level: 1, name: "Halloween Horror Nights" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Universal's Halloween event/)).toBeInTheDocument();
    // Its own word for a walk-through, on the figure and on the way in.
    expect(screen.getAllByText("Houses").length).toBeGreaterThan(0);
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Review coverage" })).toHaveAttribute(
      "aria-valuetext",
      "40 of 367 reviewed",
    );
  });

  it("lists the haunt's seasons, newest first, each linking to its own page", () => {
    renderLanding("/haunts/hhn");

    const seasons = screen.getAllByRole("link", { name: /Halloween Horror Nights 20/ });
    expect(seasons[0]).toHaveAttribute("href", "/years/hhn-2026");
    expect(seasons[1]).toHaveAttribute("href", "/years/hhn-2025");
  });

  it("makes the haunt it opens the one the app is looking at", () => {
    renderLanding("/haunts/knotts-scary-farm");

    expect(screen.getByRole("radio", { name: "Knott's Scary Farm" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("says a haunt it doesn't have is one it doesn't have", () => {
    renderLanding("/haunts/halloween-haunt");

    expect(screen.getByText("Haunt not found")).toBeInTheDocument();
  });

  it("won't average a haunt nobody has reviewed enough of", () => {
    renderLanding("/haunts/hhn");

    const ratings = within(screen.getByText("Ratings").closest("div") as HTMLElement);
    expect(ratings.getByText(/Not enough reviewed attractions to average yet/)).toBeInTheDocument();
  });
});

describe("the haunt selector on a haunt's page", () => {
  beforeEach(() => {
    mockedUseHauntLanding.mockReturnValue({
      isLoading: false,
      error: null,
      summary: {
        hauntId: "hhn",
        attractions: 10,
        seasons: 1,
        walkthroughs: 8,
        scareZones: 2,
        reviewed: 0,
        firstYear: 2026,
        lastYear: 2026,
      },
      seasons: [season(2026)],
      stats: computeYearStats([]),
    });
  });

  afterEach(() => {
    window.localStorage.removeItem(PREFERENCE_KEYS.hauntScope);
  });

  it("can still be moved while standing on a haunt's page", () => {
    renderLanding("/haunts/hhn");

    fireEvent.click(screen.getByRole("radio", { name: "All Haunts" }));

    // The page sets its own haunt on arrival, and then leaves the choice
    // alone — otherwise the selector would snap back on every click.
    expect(screen.getByRole("radio", { name: "All Haunts" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
