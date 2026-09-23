import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import {
  useAdminArchive,
  type AdminArchive,
  type AdminAttractionRow,
} from "../hooks/useAdminArchive";
import { AdminMode } from "./AdminMode";

vi.mock("../hooks/useAdminArchive");

const mockedUseAdminArchive = vi.mocked(useAdminArchive);
const navigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

const STORAGE_KEY = "haunt-ranker:admin-mode";

const TIMESTAMPS = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeYear(calendarYear: number, name = `Shadowfest ${calendarYear}`): EventYear {
  return {
    id: `y${calendarYear}`,
    calendarYear,
    hauntId: "hhn",
    name,
    description: null,
    sourceNotes: null,
    startsOn: null,
    endsOn: null,
    isSample: true,
    ...TIMESTAMPS,
  };
}

function makeAttraction(name: string): Attraction {
  const id = name.toLowerCase().replace(/\s+/g, "-");
  return {
    id,
    eventYearId: "y2101",
    attractionType: "house",
    name,
    slug: id,
    variantName: null,
    ipType: "original",
    franchiseName: null,
    shortSummary: null,
    fullOverview: null,
    storyLore: null,
    experienceDescription: null,
    developmentNotes: null,
    openingDate: null,
    closingDate: null,
    locationNotes: null,
    debutYear: null,
    parkIds: ["hollywood"],
    isSample: true,
    ...TIMESTAMPS,
  };
}

function makeRow(name: string, overrides: Partial<AdminAttractionRow> = {}): AdminAttractionRow {
  return {
    attraction: makeAttraction(name),
    eventYear: makeYear(2101),
    ratingTotal: null,
    hasNote: false,
    ...overrides,
  };
}

function makeArchive(overrides: Partial<AdminArchive> = {}): AdminArchive {
  return {
    isLoading: false,
    error: null,
    years: [makeYear(2101)],
    attractions: [makeRow("Moonlight Manor")],
    attractionCountByYear: new Map([["y2101", 1]]),
    createYear: vi.fn().mockResolvedValue(undefined),
    updateYear: vi.fn().mockResolvedValue(undefined),
    deleteYear: vi.fn().mockResolvedValue(undefined),
    deleteAttraction: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderAdmin(overrides: Partial<AdminArchive> = {}) {
  const archive = makeArchive(overrides);
  mockedUseAdminArchive.mockReturnValue(archive);
  render(
    <MemoryRouter>
      <AdminMode />
    </MemoryRouter>,
  );
  return archive;
}

function dialog() {
  return within(screen.getByRole("dialog"));
}

describe("AdminMode", () => {
  beforeEach(() => {
    mockedUseAdminArchive.mockReset();
    navigate.mockReset();
    window.localStorage.setItem(STORAGE_KEY, "true");
  });

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  describe("when Admin Mode is off", () => {
    it("says the archive is read-only and offers no editing controls", () => {
      window.localStorage.setItem(STORAGE_KEY, "false");
      renderAdmin();

      expect(screen.getByText("Admin Mode is off")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Add House/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Add year/ })).not.toBeInTheDocument();
    });
  });

  describe("attractions", () => {
    it("offers a way to add each kind of attraction", () => {
      renderAdmin();

      fireEvent.click(screen.getByRole("button", { name: /Add House/ }));
      expect(navigate).toHaveBeenCalledWith("/admin/attractions/new?type=house");

      fireEvent.click(screen.getByRole("button", { name: /Add Scare Zone/ }));
      expect(navigate).toHaveBeenCalledWith("/admin/attractions/new?type=scare_zone");
    });

    it("opens the editor for an existing attraction", () => {
      renderAdmin();
      const row = screen.getByText("Moonlight Manor").closest("li") as HTMLElement;

      fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
      expect(navigate).toHaveBeenCalledWith("/admin/attractions/moonlight-manor");
    });

    it("deletes only after confirmation", async () => {
      const archive = renderAdmin();
      const row = screen.getByText("Moonlight Manor").closest("li") as HTMLElement;

      fireEvent.click(within(row).getByRole("button", { name: "Delete" }));
      fireEvent.click(dialog().getByRole("button", { name: "Cancel" }));
      expect(archive.deleteAttraction).not.toHaveBeenCalled();

      fireEvent.click(within(row).getByRole("button", { name: "Delete" }));
      fireEvent.click(dialog().getByRole("button", { name: "Delete attraction" }));
      await waitFor(() => expect(archive.deleteAttraction).toHaveBeenCalledWith("moonlight-manor"));
    });

    it("spells out that deleting a reviewed attraction destroys the review too", () => {
      renderAdmin({
        attractions: [makeRow("Moonlight Manor", { ratingTotal: 12, hasNote: true })],
      });

      fireEvent.click(
        within(screen.getByText("Moonlight Manor").closest("li") as HTMLElement).getByRole(
          "button",
          { name: "Delete" },
        ),
      );

      const warning = dialog().getByRole("alert");
      expect(warning).toHaveTextContent(/deletes your own review/i);
      expect(warning).toHaveTextContent("12.0 / 15");
      expect(warning).toHaveTextContent(/note you wrote/i);
    });

    it("says nothing about a review when there isn't one", () => {
      renderAdmin({ attractions: [makeRow("Unrated House")] });

      fireEvent.click(
        within(screen.getByText("Unrated House").closest("li") as HTMLElement).getByRole("button", {
          name: "Delete",
        }),
      );

      expect(dialog().queryByRole("alert")).not.toBeInTheDocument();
    });

    it("keeps the dialog open and shows why when a delete is rejected", async () => {
      renderAdmin({
        deleteAttraction: vi.fn().mockRejectedValue(new Error("Database is locked")),
      });

      fireEvent.click(
        within(screen.getByText("Moonlight Manor").closest("li") as HTMLElement).getByRole(
          "button",
          { name: "Delete" },
        ),
      );
      fireEvent.click(dialog().getByRole("button", { name: "Delete attraction" }));

      expect(await screen.findByText("Database is locked")).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("event years", () => {
    it("adds a year", async () => {
      const archive = renderAdmin();

      fireEvent.change(screen.getByLabelText("Year"), { target: { value: "2104" } });
      fireEvent.change(screen.getByLabelText("Event name"), {
        target: { value: "Shadowfest 2104" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Add year/ }));

      await waitFor(() =>
        expect(archive.createYear).toHaveBeenCalledWith({
          calendarYear: 2104,
          hauntId: "hhn",
          name: "Shadowfest 2104",
        }),
      );
    });

    it("surfaces the repository's complaint when a year is rejected", async () => {
      renderAdmin({
        createYear: vi.fn().mockRejectedValue(new Error("An event year needs a name")),
      });

      fireEvent.click(screen.getByRole("button", { name: /Add year/ }));

      expect(await screen.findByText("An event year needs a name")).toBeInTheDocument();
    });

    it("opens the year's own editor, where its sources and artwork live", () => {
      renderAdmin();
      const row = screen.getByText("Shadowfest 2101").closest("li") as HTMLElement;

      fireEvent.click(within(row).getByRole("button", { name: "Edit" }));

      expect(navigate).toHaveBeenCalledWith("/admin/years/y2101");
    });

    it("will not delete a year that still holds attractions", () => {
      renderAdmin({ attractionCountByYear: new Map([["y2101", 3]]) });
      const row = screen.getByText("Shadowfest 2101").closest("li") as HTMLElement;

      const deleteButton = within(row).getByRole("button", { name: "Delete" });
      expect(deleteButton).toBeDisabled();
      expect(deleteButton).toHaveAttribute(
        "title",
        expect.stringContaining("Move or delete this year's attractions first"),
      );
    });

    it("deletes an empty year after confirmation", async () => {
      const archive = renderAdmin({
        years: [makeYear(2104, "Shadowfest 2104")],
        attractions: [],
        attractionCountByYear: new Map(),
      });
      const row = screen.getByText("Shadowfest 2104").closest("li") as HTMLElement;

      fireEvent.click(within(row).getByRole("button", { name: "Delete" }));
      fireEvent.click(dialog().getByRole("button", { name: "Delete year" }));

      await waitFor(() => expect(archive.deleteYear).toHaveBeenCalledWith("y2104"));
    });
  });

  it("shows a loading state", () => {
    renderAdmin({ isLoading: true });
    expect(screen.getByText("Loading the archive…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    renderAdmin({ error: "Database unavailable" });
    expect(screen.getByText("Couldn't load the archive")).toBeInTheDocument();
  });
});
