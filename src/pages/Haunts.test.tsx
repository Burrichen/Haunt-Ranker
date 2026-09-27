import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HauntScopeProvider } from "../components/layout/HauntScopeProvider";
import { HauntSelector } from "../components/layout/HauntSelector";
import { useHaunts } from "../hooks/useHaunts";
import { PREFERENCE_KEYS } from "../preferences/localPreferences";
import type { HauntArchiveSummary } from "../utils/haunts";
import { TestHaunts } from "../test/hauntRegistry";
import { Haunts } from "./Haunts";

vi.mock("../hooks/useHaunts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../hooks/useHaunts")>()),
  useHaunts: vi.fn(),
}));

const mockedUseHaunts = vi.mocked(useHaunts);

const HHN: HauntArchiveSummary = {
  hauntId: "hhn",
  attractions: 367,
  seasons: 16,
  walkthroughs: 300,
  scareZones: 67,
  reviewed: 40,
  firstYear: 2010,
  lastYear: 2026,
};

const KNOTTS: HauntArchiveSummary = {
  hauntId: "knotts-scary-farm",
  attractions: 0,
  seasons: 0,
  walkthroughs: 0,
  scareZones: 0,
  reviewed: 0,
  firstYear: null,
  lastYear: null,
};

function renderHaunts() {
  return render(
    <TestHaunts>
      <MemoryRouter initialEntries={["/haunts"]}>
        <HauntScopeProvider>
          <HauntSelector />
          <Routes>
            <Route path="/haunts" element={<Haunts />} />
          </Routes>
        </HauntScopeProvider>
      </MemoryRouter>
    </TestHaunts>,
  );
}

describe("Haunts", () => {
  beforeEach(() => {
    mockedUseHaunts.mockReturnValue({ isLoading: false, error: null, haunts: [HHN, KNOTTS] });
  });

  afterEach(() => {
    window.localStorage.removeItem(PREFERENCE_KEYS.hauntScope);
  });

  it("leads with the home collection and still lists the others properly", () => {
    renderHaunts();

    expect(screen.getByText("Home collection")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open the Halloween Horror Nights archive/i }),
    ).toBeInTheDocument();

    const others = within(screen.getByRole("region", { name: "Other haunts" }));
    expect(others.getByRole("heading", { name: "Other Haunts" })).toBeInTheDocument();
    expect(
      others.getByRole("link", { name: /Open the Knott's Scary Farm archive/i }),
    ).toBeInTheDocument();
  });

  it("counts what each haunt holds, in that haunt's own words", () => {
    renderHaunts();

    const hhn = within(screen.getByRole("link", { name: /Halloween Horror Nights archive/i }));
    expect(hhn.getByText("Houses")).toBeInTheDocument();
    expect(hhn.getByText("300")).toBeInTheDocument();
    expect(hhn.getByText("Scare Zones")).toBeInTheDocument();
    expect(hhn.getByText("2010–2026")).toBeInTheDocument();
    expect(
      hhn.getByRole("progressbar", { name: "Halloween Horror Nights reviewed" }),
    ).toHaveAttribute("aria-valuetext", "40 of 367 reviewed");
  });

  it("says an empty archive is empty rather than showing zeroes as figures", () => {
    renderHaunts();

    const knotts = within(screen.getByRole("link", { name: /Knott's Scary Farm archive/i }));
    expect(knotts.getByText("Archive not yet entered.")).toBeInTheDocument();
    expect(knotts.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("opening a haunt makes it the one the app is looking at", () => {
    renderHaunts();

    fireEvent.click(screen.getByRole("link", { name: /Knott's Scary Farm archive/i }));

    expect(window.localStorage.getItem(PREFERENCE_KEYS.hauntScope)).toBe("knotts-scary-farm");
    expect(screen.getByRole("radio", { name: "Knott's Scary Farm" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("shows a loading state and an error state", () => {
    mockedUseHaunts.mockReturnValue({ isLoading: true, error: null, haunts: [] });
    const first = renderHaunts();
    expect(screen.getByText("Loading haunts…")).toBeInTheDocument();
    first.unmount();

    mockedUseHaunts.mockReturnValue({
      isLoading: false,
      error: "Database unavailable",
      haunts: [],
    });
    renderHaunts();
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
  });
});
