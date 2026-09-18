import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventYear } from "../models/eventYear";
import type { Source } from "../models/source";
import { useYearEditor, type YearEditor as YearEditorState } from "../hooks/useYearEditor";
import { YearEditor } from "./YearEditor";

vi.mock("../hooks/useYearEditor");
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));
vi.mock("../media/mediaFiles", () => ({
  importLocalMediaFile: vi.fn(),
  deleteLocalMediaFile: vi.fn(),
}));

const mockedUseYearEditor = vi.mocked(useYearEditor);
const STORAGE_KEY = "haunt-ranker:admin-mode";

const TIMESTAMPS = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const YEAR: EventYear = {
  id: "y2101",
  calendarYear: 2101,
  name: "Shadowfest 2101",
  description: "A fictional stand-in event.",
  sourceNotes: null,
  isSample: true,
  ...TIMESTAMPS,
};

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "s1",
    sourceType: "youtube",
    title: "Shadowfest 2101 recap",
    url: "https://youtube.invalid/watch?v=recap",
    publisher: "A Channel",
    publishedAt: "2101-11-01",
    notes: null,
    isSample: true,
    ...TIMESTAMPS,
    ...overrides,
  };
}

function makeEditor(overrides: Partial<YearEditorState> = {}): YearEditorState {
  return {
    isLoading: false,
    error: null,
    notFound: false,
    eventYear: YEAR,
    sources: [],
    allSources: [],
    media: [],
    save: vi.fn().mockResolvedValue(undefined),
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

function renderYearEditor(overrides: Partial<YearEditorState> = {}) {
  const editor = makeEditor(overrides);
  mockedUseYearEditor.mockReturnValue(editor);
  render(
    <MemoryRouter initialEntries={["/admin/years/y2101"]}>
      <Routes>
        <Route path="/admin/years/:eventYearId" element={<YearEditor />} />
      </Routes>
    </MemoryRouter>,
  );
  return editor;
}

const sourcesSection = () => within(screen.getByRole("region", { name: "Sources" }));
const mediaSection = () => within(screen.getByRole("region", { name: "Media" }));

describe("YearEditor", () => {
  beforeEach(() => {
    mockedUseYearEditor.mockReset();
    window.localStorage.setItem(STORAGE_KEY, "true");
  });

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("is read-only while Admin Mode is off", () => {
    window.localStorage.setItem(STORAGE_KEY, "false");
    renderYearEditor();

    expect(screen.getByText("Admin Mode is off")).toBeInTheDocument();
    expect(screen.queryByLabelText("Event name")).not.toBeInTheDocument();
  });

  it("edits the event's own details", async () => {
    const editor = renderYearEditor();

    expect(screen.getByLabelText("Event name")).toHaveValue("Shadowfest 2101");
    fireEvent.change(screen.getByLabelText("Source notes"), {
      target: { value: "Line-up confirmed from the official site." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save event year" }));

    await waitFor(() =>
      expect(editor.save).toHaveBeenCalledWith({
        name: "Shadowfest 2101",
        calendarYear: 2101,
        description: "A fictional stand-in event.",
        sourceNotes: "Line-up confirmed from the official site.",
      }),
    );
  });

  describe("sources", () => {
    it("attaches a YouTube source to the event year itself", async () => {
      const editor = renderYearEditor();
      const sources = sourcesSection();

      fireEvent.change(sources.getByLabelText("Title"), {
        target: { value: "Shadowfest 2101 recap" },
      });
      fireEvent.change(sources.getByLabelText("Type"), { target: { value: "youtube" } });
      fireEvent.change(sources.getByLabelText("URL"), {
        target: { value: "https://youtube.invalid/watch?v=recap" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Add source/ }));

      await waitFor(() =>
        expect(editor.addSource).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Shadowfest 2101 recap",
            sourceType: "youtube",
            url: "https://youtube.invalid/watch?v=recap",
          }),
        ),
      );
    });

    it("cites a source that already exists rather than duplicating it", async () => {
      const existing = makeSource({ id: "s9", title: "Official line-up page" });
      const editor = renderYearEditor({ allSources: [existing] });

      fireEvent.change(sourcesSection().getByLabelText("Cite an existing source"), {
        target: { value: "s9" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Cite source/ }));

      await waitFor(() => expect(editor.attachSource).toHaveBeenCalledWith("s9"));
    });

    it("distinguishes detaching from deleting", async () => {
      const source = makeSource();
      const editor = renderYearEditor({ sources: [source], allSources: [source] });

      fireEvent.click(screen.getByRole("button", { name: `Detach ${source.title}` }));
      await waitFor(() => expect(editor.removeSource).toHaveBeenCalledWith("s1"));
      expect(editor.deleteSource).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: `Edit ${source.title}` }));
      fireEvent.click(screen.getByRole("button", { name: "Delete everywhere" }));
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Delete source" }),
      );

      await waitFor(() => expect(editor.deleteSource).toHaveBeenCalledWith("s1"));
    });

    it("edits a source in place", async () => {
      const source = makeSource();
      const editor = renderYearEditor({ sources: [source], allSources: [source] });

      fireEvent.click(screen.getByRole("button", { name: `Edit ${source.title}` }));
      const dialog = within(screen.getByRole("dialog"));
      fireEvent.change(dialog.getByLabelText("Publisher / channel"), {
        target: { value: "Corrected Channel" },
      });
      fireEvent.click(dialog.getByRole("button", { name: "Save source" }));

      await waitFor(() =>
        expect(editor.updateSource).toHaveBeenCalledWith(
          "s1",
          expect.objectContaining({ publisher: "Corrected Channel" }),
        ),
      );
    });

    it("offers to open a source's URL, which goes to the system browser", () => {
      const source = makeSource();
      renderYearEditor({ sources: [source], allSources: [source] });

      expect(screen.getByRole("button", { name: `Open ${source.title}` })).toBeInTheDocument();
    });
  });

  describe("media", () => {
    it("adds event artwork as a reference by default", async () => {
      const editor = renderYearEditor();
      const media = mediaSection();

      fireEvent.change(media.getByLabelText("Kind"), { target: { value: "event_artwork" } });
      fireEvent.change(media.getByLabelText("Remote URL"), {
        target: { value: "https://example.invalid/key-art.jpg" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Add media/ }));

      await waitFor(() =>
        expect(editor.addMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            mediaType: "event_artwork",
            url: "https://example.invalid/key-art.jpg",
            localPath: null,
            distribution: "reference",
          }),
        ),
      );
    });

    it("explains what each distribution policy actually means", () => {
      renderYearEditor();
      const media = mediaSection();

      expect(media.getByText(/Never copied, never shipped with the app/)).toBeInTheDocument();

      fireEvent.click(
        within(media.getByRole("radiogroup", { name: "Distribution policy" })).getByRole("radio", {
          name: "Cleared to bundle",
        }),
      );
      expect(media.getByText(/Finding an image online is not that decision/)).toBeInTheDocument();
    });
  });

  it("shows a not-found state", () => {
    renderYearEditor({ notFound: true, eventYear: null });
    expect(screen.getByText("Event year not found")).toBeInTheDocument();
  });
});
