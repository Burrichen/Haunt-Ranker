import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Attraction } from "../models/attraction";
import type { Character } from "../models/character";
import type { EventYear } from "../models/eventYear";
import {
  useAttractionEditor,
  type AttractionEditor as EditorState,
} from "../hooks/useAttractionEditor";
import { AttractionEditor } from "./AttractionEditor";

vi.mock("../hooks/useAttractionEditor");

const mockedUseEditor = vi.mocked(useAttractionEditor);
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

const YEAR: EventYear = {
  id: "y2101",
  calendarYear: 2101,
  name: "Shadowfest 2101",
  description: null,
  sourceNotes: null,
  startsOn: null,
  endsOn: null,
  isSample: true,
  ...TIMESTAMPS,
};

function makeAttraction(overrides: Partial<Attraction> = {}): Attraction {
  return {
    id: "moonlight-manor",
    eventYearId: "y2101",
    attractionType: "house",
    name: "Moonlight Manor",
    slug: "moonlight-manor",
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
    parkIds: ["hollywood"],
    isSample: true,
    ...TIMESTAMPS,
    ...overrides,
  };
}

function makeEditor(overrides: Partial<EditorState> = {}): EditorState {
  return {
    isLoading: false,
    error: null,
    notFound: false,
    attraction: makeAttraction(),
    years: [YEAR],
    otherAttractions: [makeAttraction({ id: "pumpkin-pier", name: "Pumpkin Pier" })],
    characters: [],
    relations: [],
    sources: [],
    allSources: [],
    media: [],
    save: vi.fn().mockResolvedValue("moonlight-manor"),
    deleteAttraction: vi.fn().mockResolvedValue(undefined),
    addCharacter: vi.fn().mockResolvedValue(undefined),
    removeCharacter: vi.fn().mockResolvedValue(undefined),
    addRelation: vi.fn().mockResolvedValue(undefined),
    removeRelation: vi.fn().mockResolvedValue(undefined),
    addSource: vi.fn().mockResolvedValue(undefined),
    updateSource: vi.fn().mockResolvedValue(undefined),
    attachSource: vi.fn().mockResolvedValue(undefined),
    removeSource: vi.fn().mockResolvedValue(undefined),
    deleteSource: vi.fn().mockResolvedValue(undefined),
    addMedia: vi.fn().mockResolvedValue(undefined),
    removeMedia: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** The attraction's own form, scoped so its fields don't collide with the sub-editors'. */
function form() {
  return within(screen.getByRole("form", { name: "Attraction details" }));
}

/** One of the sub-record editors, each its own labelled region. */
function section(name: string) {
  return within(screen.getByRole("region", { name }));
}

/** `path` decides whether the page is creating or editing. */
function renderEditor(overrides: Partial<EditorState> = {}, path = "/admin/attractions/mm") {
  const editor = makeEditor(overrides);
  mockedUseEditor.mockReturnValue(editor);
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/attractions/new" element={<AttractionEditor />} />
        <Route path="/admin/attractions/:attractionId" element={<AttractionEditor />} />
      </Routes>
    </MemoryRouter>,
  );
  return editor;
}

describe("AttractionEditor", () => {
  beforeEach(() => {
    mockedUseEditor.mockReset();
    navigate.mockReset();
    window.localStorage.setItem(STORAGE_KEY, "true");
  });

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("refuses to edit anything while Admin Mode is off", () => {
    window.localStorage.setItem(STORAGE_KEY, "false");
    renderEditor();

    expect(screen.getByText("Admin Mode is off")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  describe("validation", () => {
    it("will not save without a name, and doesn't call the repository", async () => {
      const editor = renderEditor({ attraction: makeAttraction({ name: "" }) });

      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

      expect(await screen.findByText("A name is required.")).toBeInTheDocument();
      expect(editor.save).not.toHaveBeenCalled();
    });

    it("will not save without a park", async () => {
      const editor = renderEditor({ attraction: makeAttraction({ parkIds: [] }) });

      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

      expect(await screen.findByText("Pick at least one park.")).toBeInTheDocument();
      expect(editor.save).not.toHaveBeenCalled();
    });

    it("accepts an attraction that only has the required facts", async () => {
      const editor = renderEditor({
        attraction: makeAttraction({ ipType: null, franchiseName: null, shortSummary: null }),
      });

      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

      await waitFor(() => expect(editor.save).toHaveBeenCalledOnce());
      expect(editor.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Moonlight Manor",
          parkIds: ["hollywood"],
          eventYearId: "y2101",
          ipType: null,
          franchiseName: null,
        }),
      );
    });
  });

  describe("editing the record", () => {
    it("saves changed facts", async () => {
      const editor = renderEditor();

      fireEvent.change(form().getByLabelText("Name"), { target: { value: "Moonlight Manor II" } });
      fireEvent.change(form().getByLabelText("Franchise (optional)"), {
        target: { value: "Moonlight" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

      await waitFor(() =>
        expect(editor.save).toHaveBeenCalledWith(
          expect.objectContaining({ name: "Moonlight Manor II", franchiseName: "Moonlight" }),
        ),
      );
    });

    it("can put one attraction at both parks", async () => {
      const editor = renderEditor();

      fireEvent.click(screen.getByRole("button", { name: "Orlando" }));
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

      await waitFor(() =>
        expect(editor.save).toHaveBeenCalledWith(
          expect.objectContaining({ parkIds: ["hollywood", "orlando"] }),
        ),
      );
    });

    it("shows what the repository rejected and keeps the user's input", async () => {
      renderEditor({
        save: vi.fn().mockRejectedValue(new Error("UNIQUE constraint failed: attractions.slug")),
      });

      fireEvent.change(form().getByLabelText("Name"), { target: { value: "Duplicate" } });
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

      expect(
        await screen.findByText("UNIQUE constraint failed: attractions.slug"),
      ).toBeInTheDocument();
      expect(form().getByLabelText("Name")).toHaveValue("Duplicate");
    });
  });

  describe("creating", () => {
    it("shows only the core form until the attraction exists", () => {
      renderEditor({ attraction: null }, "/admin/attractions/new");

      expect(screen.getByRole("button", { name: "Create attraction" })).toBeInTheDocument();
      expect(screen.getByText(/can be added once this attraction is saved/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Add character/ })).not.toBeInTheDocument();
    });

    it("lands on the saved attraction's editor so its sub-records can be added", async () => {
      const save = vi.fn().mockResolvedValue("new-id");
      renderEditor({ attraction: null, save }, "/admin/attractions/new");

      fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Brand New House" } });
      fireEvent.click(screen.getByRole("button", { name: "Hollywood" }));
      fireEvent.click(screen.getByRole("button", { name: "Create attraction" }));

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith("/admin/attractions/new-id", { replace: true }),
      );
    });

    it("says an event year is needed before an attraction can exist", () => {
      renderEditor({ attraction: null, years: [] }, "/admin/attractions/new");
      expect(screen.getByText("Add an event year first")).toBeInTheDocument();
    });
  });

  describe("sub-records", () => {
    it("adds and removes a character", async () => {
      const character: Character = {
        id: "c1",
        attractionId: "moonlight-manor",
        name: "The Groundskeeper",
        description: null,
        ...TIMESTAMPS,
      };
      const editor = renderEditor({ characters: [character] });

      fireEvent.click(screen.getByRole("button", { name: "Remove The Groundskeeper" }));
      await waitFor(() => expect(editor.removeCharacter).toHaveBeenCalledWith("c1"));

      fireEvent.change(section("Characters / creatures").getByLabelText("Name"), {
        target: { value: "Nurse Static" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Add character/ }));

      await waitFor(() =>
        expect(editor.addCharacter).toHaveBeenCalledWith({
          name: "Nurse Static",
          description: null,
        }),
      );
    });

    it("links a related attraction", async () => {
      const editor = renderEditor();

      fireEvent.change(screen.getByLabelText("Attraction"), {
        target: { value: "pumpkin-pier" },
      });
      fireEvent.change(screen.getByLabelText("Relationship"), {
        target: { value: "sequel" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Link attraction/ }));

      await waitFor(() =>
        expect(editor.addRelation).toHaveBeenCalledWith({
          relatedAttractionId: "pumpkin-pier",
          relationType: "sequel",
        }),
      );
    });

    it("adds a source with everything known about it", async () => {
      const editor = renderEditor();
      const sources = section("Sources");

      fireEvent.change(sources.getByLabelText("Title"), {
        target: { value: "Walkthrough video" },
      });
      fireEvent.change(sources.getByLabelText("Type"), { target: { value: "youtube" } });
      fireEvent.change(sources.getByLabelText("URL"), {
        target: { value: "https://youtube.invalid/watch?v=1" },
      });
      fireEvent.change(sources.getByLabelText("Publisher / channel"), {
        target: { value: "A Channel" },
      });
      fireEvent.change(sources.getByLabelText("Date"), { target: { value: "2101-09-14" } });
      fireEvent.change(sources.getByLabelText("Notes"), { target: { value: "Full walkthrough." } });

      fireEvent.click(screen.getByRole("button", { name: /Add source/ }));

      await waitFor(() =>
        expect(editor.addSource).toHaveBeenCalledWith({
          title: "Walkthrough video",
          sourceType: "youtube",
          url: "https://youtube.invalid/watch?v=1",
          publisher: "A Channel",
          publishedAt: "2101-09-14",
          notes: "Full walkthrough.",
        }),
      );
    });

    it("offers every source type the archive needs", () => {
      renderEditor();
      const typeField = section("Sources").getByLabelText("Type");

      for (const label of [
        "Universal / Official",
        "YouTube",
        "Website / Article",
        "Promotional Material",
        "Other",
      ]) {
        expect(within(typeField).getByRole("option", { name: label })).toBeInTheDocument();
      }
    });

    it("adds a remote media reference, defaulting to reference-only", async () => {
      const editor = renderEditor();
      const media = section("Media");

      fireEvent.change(media.getByLabelText("Remote URL"), {
        target: { value: "https://example.invalid/poster.jpg" },
      });
      fireEvent.change(media.getByLabelText("Attribution"), { target: { value: "Universal" } });
      fireEvent.change(media.getByLabelText("License notes"), {
        target: { value: "Reuse not cleared." },
      });
      fireEvent.click(screen.getByRole("button", { name: /Add media/ }));

      await waitFor(() =>
        expect(editor.addMedia).toHaveBeenCalledWith({
          mediaType: "poster",
          url: "https://example.invalid/poster.jpg",
          localPath: null,
          attribution: "Universal",
          licenseNotes: "Reuse not cleared.",
          sourceId: null,
          distribution: "reference",
        }),
      );
    });

    it("can mark one asset as cleared to bundle, deliberately", async () => {
      const editor = renderEditor();
      const media = section("Media");

      fireEvent.change(media.getByLabelText("Remote URL"), {
        target: { value: "https://example.invalid/ours.png" },
      });
      fireEvent.click(
        within(media.getByRole("radiogroup", { name: "Distribution policy" })).getByRole("radio", {
          name: "Cleared to bundle",
        }),
      );
      fireEvent.click(screen.getByRole("button", { name: /Add media/ }));

      await waitFor(() =>
        expect(editor.addMedia).toHaveBeenCalledWith(
          expect.objectContaining({ distribution: "bundled" }),
        ),
      );
    });

    it("says plainly that missing artwork is normal and nothing is generated", () => {
      renderEditor();
      expect(
        section("Media").getByText(/never anything generated to fill a gap/i),
      ).toBeInTheDocument();
    });
  });

  describe("deleting", () => {
    it("warns that a review goes with it, and only deletes on confirmation", async () => {
      const editor = renderEditor();

      fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
      expect(
        within(screen.getByRole("dialog")).getByText(/rated or written a note/i),
      ).toBeInTheDocument();

      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Delete attraction" }),
      );

      await waitFor(() => expect(editor.deleteAttraction).toHaveBeenCalledOnce());
      await waitFor(() => expect(navigate).toHaveBeenCalledWith("/admin", { replace: true }));
    });

    it("stays put and explains when the delete is rejected", async () => {
      renderEditor({
        deleteAttraction: vi.fn().mockRejectedValue(new Error("Database is locked")),
      });

      fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Delete attraction" }),
      );

      expect(await screen.findByText("Database is locked")).toBeInTheDocument();
      expect(navigate).not.toHaveBeenCalledWith("/admin", { replace: true });
    });
  });

  it("shows a not-found state", () => {
    renderEditor({ notFound: true, attraction: null });
    expect(screen.getByText("Attraction not found")).toBeInTheDocument();
  });
});
