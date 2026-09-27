import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useHauntPackImport, type HauntPackImportState } from "../../hooks/useHauntPackImport";
import type { PackPreview } from "../../packs/planPackImport";
import { HauntPackImport } from "./HauntPackImport";

vi.mock("../../hooks/useHauntPackImport");

const mockedUseHauntPackImport = vi.mocked(useHauntPackImport);

function counts(created = 0, updated = 0, unchanged = 0) {
  return { created, updated, unchanged };
}

function makePreview(overrides: Partial<PackPreview> = {}): PackPreview {
  return {
    schema: "haunt-ranker.haunt-pack/v1",
    packId: "moonlight-fright-festival",
    packVersion: "2026.1.0",
    hauntId: "moonlight-fright-festival",
    hauntName: "Moonlight Fright Festival",
    isNewHaunt: true,
    generatedAt: "2026-09-01T00:00:00.000Z",
    provenance: "Fictional development pack.",
    seasons: counts(1),
    experiences: counts(4),
    experienceTypes: counts(3),
    venues: counts(1),
    sources: counts(3),
    characters: counts(),
    mediaReferences: 0,
    citationsAdded: 5,
    warnings: [],
    conflicts: [],
    ...overrides,
  };
}

function makeState(overrides: Partial<HauntPackImportState> = {}): HauntPackImportState {
  return {
    text: "",
    setText: vi.fn(),
    sourcePath: null,
    isBusy: false,
    pending: null,
    result: null,
    refusal: null,
    history: [],
    chooseFile: vi.fn().mockResolvedValue(undefined),
    check: vi.fn().mockResolvedValue(undefined),
    confirm: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function renderPanel(overrides: Partial<HauntPackImportState> = {}) {
  const state = makeState(overrides);
  mockedUseHauntPackImport.mockReturnValue(state);
  render(<HauntPackImport />);
  return state;
}

describe("HauntPackImport", () => {
  it("won't check an empty box", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: "Check this pack" })).toBeDisabled();
  });

  it("checks pasted text without writing anything", () => {
    const state = renderPanel({ text: '{"schema":"haunt-ranker.haunt-pack/v1"}' });

    fireEvent.click(screen.getByRole("button", { name: "Check this pack" }));

    expect(state.check).toHaveBeenCalled();
    expect(state.confirm).not.toHaveBeenCalled();
  });

  it("shows what the pack would do before anything is imported", () => {
    renderPanel({
      text: "{}",
      pending: { pack: {}, plan: {}, preview: makePreview() } as never,
    });

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Moonlight Fright Festival")).toBeInTheDocument();
    expect(within(dialog).getByText("New to this archive")).toBeInTheDocument();

    const experiences = within(dialog).getByRole("row", { name: /Experiences/ });
    expect(
      within(experiences)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["4", "0", "0"]);
    expect(
      within(dialog).getByText(/never anyone.s ratings, notes or rankings/),
    ).toBeInTheDocument();
  });

  it("lists warnings and conflicts so they can be read before agreeing", () => {
    renderPanel({
      text: "{}",
      pending: {
        pack: {},
        plan: {},
        preview: makePreview({
          warnings: ["moonlight:2026:trail:hollow-road sits outside this haunt's namespace"],
          conflicts: [
            {
              kind: "manual-edit",
              id: "moonlight-fright-festival:2026:trail:hollow-road",
              name: "Hollow Road",
              field: "short_summary",
              detail: "Edited here after the last pack wrote it.",
              current: "Corrected by hand.",
              incoming: "A lantern-lit walk.",
            },
          ],
        }),
      } as never,
    });

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/1 conflict with edits made here/)).toBeInTheDocument();
    expect(within(dialog).getByText("Corrected by hand.")).toBeInTheDocument();
    expect(within(dialog).getByText("A lantern-lit walk.")).toBeInTheDocument();
    expect(within(dialog).getByText(/1 warning/)).toBeInTheDocument();
    expect(within(dialog).getByText(/outside this haunt's namespace/)).toBeInTheDocument();
  });

  it("imports only once the preview is confirmed", () => {
    const state = renderPanel({
      text: "{}",
      pending: { pack: {}, plan: {}, preview: makePreview() } as never,
    });

    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    expect(state.confirm).toHaveBeenCalled();
  });

  it("says why a pack was refused, and that nothing changed", () => {
    renderPanel({
      text: "{}",
      refusal: {
        message: "This Haunt Pack can't be read.",
        problems: ["haunt.id is required", "seasons[0].calendarYear must be a year"],
      },
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Nothing in the archive has changed.");
    expect(alert).toHaveTextContent("haunt.id is required");
    expect(alert).toHaveTextContent("seasons[0].calendarYear must be a year");
  });

  it("keeps the record of packs imported before", () => {
    renderPanel({
      history: [
        {
          id: "import-1",
          packId: "moonlight-fright-festival",
          packVersion: "2026.1.0",
          schemaId: "haunt-ranker.haunt-pack/v1",
          hauntId: "moonlight-fright-festival",
          hauntName: "Moonlight Fright Festival",
          generatedAt: "2026-09-01T00:00:00.000Z",
          importedAt: "2026-09-02T10:00:00.000Z",
          summary: JSON.stringify({ experiences: counts(4) }),
          provenanceNotes: "Fictional development pack.",
        },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: /1 pack import on this machine/ }));

    expect(
      screen.getByText(/Moonlight Fright Festival · moonlight-fright-festival 2026.1.0/),
    ).toBeInTheDocument();
    expect(screen.getByText(/experiences: 4 new/)).toBeInTheDocument();
  });
});
