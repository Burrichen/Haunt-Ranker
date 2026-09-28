import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SqlExecutor } from "../../database/types";
import { HAUNT_PACK_SCHEMA } from "../../packs/hauntPack";
import { createTestDatabase } from "../../test/createTestDatabase";
import { TestHaunts } from "../../test/hauntRegistry";
import { AddHaunt } from "./AddHaunt";

/**
 * The whole workflow, as a person does it, against a real migrated archive:
 * Generate Prompt → copy → paste the assistant's pack → preview → import.
 */
const database = vi.hoisted(() => ({ current: null as SqlExecutor | null }));

vi.mock("../../database/client", () => ({
  DATABASE_URL: "sqlite:test.db",
  getDatabase: () => Promise.resolve(database.current),
}));

const FIXTURE_TEXT = readFileSync(
  join(
    import.meta.dirname,
    "..",
    "..",
    "test",
    "fixtures",
    "moonlight-fright-festival.hauntpack.json",
  ),
  "utf8",
);

const writeText = vi.fn<(text: string) => Promise<void>>();

function renderAddHaunt(onImported = vi.fn()) {
  render(
    <MemoryRouter>
      <TestHaunts>
        <AddHaunt onImported={onImported} />
      </TestHaunts>
    </MemoryRouter>,
  );
  return { onImported };
}

function openResearch() {
  fireEvent.click(screen.getByRole("radio", { name: "Generate Research Prompt" }));
}

beforeEach(() => {
  database.current = createTestDatabase();
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});

describe("AddHaunt", () => {
  it("offers the three ways to add a haunt", () => {
    renderAddHaunt();

    const routes = screen.getByRole("radiogroup", { name: "How to add a haunt" });
    expect(
      within(routes)
        .getAllByRole("radio")
        .map((radio) => radio.textContent),
    ).toEqual(["Import Haunt Pack", "Create Manually", "Generate Research Prompt"]);
  });

  it("runs Generate Prompt → copy → paste → preview → import", async () => {
    const { onImported } = renderAddHaunt();
    openResearch();

    // The steps are explained on the page itself.
    const steps = screen.getByRole("list", { name: "How it works" });
    expect(
      within(steps)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Copy the research prompt.",
      "Ask your preferred assistant to research the event.",
      "Copy the resulting Haunt Pack.",
      "Paste it into Haunt Ranker.",
      "Review validation.",
      "Import.",
    ]);

    // 1. Generate.
    fireEvent.change(screen.getByLabelText("Haunt name"), {
      target: { value: "Moonlight Fright Festival" },
    });
    fireEvent.change(screen.getByLabelText("Years"), { target: { value: "2026" } });
    fireEvent.change(screen.getByLabelText("Optional notes"), {
      target: { value: "Include the closing show." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate prompt" }));

    const promptBox = await screen.findByLabelText<HTMLTextAreaElement>("Research prompt");
    expect(promptBox.value).toContain("Moonlight Fright Festival");
    expect(promptBox.value).toContain(HAUNT_PACK_SCHEMA);
    expect(promptBox.value).toContain("> Include the closing show.");

    // 2. Copy.
    fireEvent.click(screen.getByRole("button", { name: "Copy Prompt" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(promptBox.value));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();

    // 3. Paste the assistant's reply — code fence and all.
    fireEvent.change(screen.getByLabelText("Haunt Pack from your assistant"), {
      target: { value: `\`\`\`json\n${FIXTURE_TEXT.trim()}\n\`\`\`` },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check this pack" }));

    // 4. Preview, with nothing written yet.
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Moonlight Fright Festival")).toBeInTheDocument();
    expect(within(dialog).getByText("New to this archive")).toBeInTheDocument();
    const experiences = within(dialog).getByRole("row", { name: /Experiences/ });
    expect(within(experiences).getAllByRole("cell")[0]).toHaveTextContent("4");
    expect(
      await database.current!.select(
        "SELECT id FROM haunts WHERE id = 'moonlight-fright-festival'",
      ),
    ).toEqual([]);

    // 5. Import.
    fireEvent.click(within(dialog).getByRole("button", { name: "Import" }));

    expect(
      await screen.findByText(/Imported Moonlight Fright Festival from moonlight-fright-festival/),
    ).toBeInTheDocument();
    expect(onImported).toHaveBeenCalled();
    const rows = await database.current!.select<Array<{ name: string }>>(
      "SELECT name FROM attractions WHERE source_pack_id = 'moonlight-fright-festival' ORDER BY name",
    );
    expect(rows).toHaveLength(4);
  });

  it("tells the person when the haunt is already installed", async () => {
    renderAddHaunt();
    openResearch();

    fireEvent.change(screen.getByLabelText("Haunt name"), {
      target: { value: "Knott's Scary Farm" },
    });
    fireEvent.change(screen.getByLabelText("Years"), { target: { value: "2024–2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate prompt" }));

    expect(
      await screen.findByText(/Knott's Scary Farm is already in your archive/),
    ).toBeInTheDocument();
    const promptBox = screen.getByLabelText<HTMLTextAreaElement>("Research prompt");
    expect(promptBox.value).toContain("`haunt.id`: `knotts-scary-farm`");
  });

  it("explains what's wrong with the form instead of generating", async () => {
    renderAddHaunt();
    openResearch();

    fireEvent.change(screen.getByLabelText("Years"), { target: { value: "2026–2024" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate prompt" }));

    expect(await screen.findByText("Enter the haunt's name.")).toBeInTheDocument();
    expect(screen.getByText(/runs backwards/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Research prompt")).not.toBeInTheDocument();
  });

  it("retires a prompt once the request changes", async () => {
    renderAddHaunt();
    openResearch();

    fireEvent.change(screen.getByLabelText("Haunt name"), { target: { value: "Somewhere" } });
    fireEvent.change(screen.getByLabelText("Years"), { target: { value: "2025" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate prompt" }));
    await screen.findByLabelText("Research prompt");

    fireEvent.change(screen.getByLabelText("Years"), { target: { value: "2026" } });

    expect(screen.queryByLabelText("Research prompt")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy Prompt" })).not.toBeInTheDocument();
  });

  it("shows the parse error for a pack that isn't valid JSON", async () => {
    renderAddHaunt();
    openResearch();

    fireEvent.change(screen.getByLabelText("Haunt Pack from your assistant"), {
      target: { value: FIXTURE_TEXT.replace(/\n}\s*$/, ",\n}") },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check this pack" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/This isn't valid JSON, so it can't be read as a Haunt Pack\./);
    expect(alert).toHaveTextContent(/Nothing in the archive has changed/);
  });

  it("keeps a pasted pack when switching between routes", () => {
    renderAddHaunt();
    openResearch();
    fireEvent.change(screen.getByLabelText("Haunt Pack from your assistant"), {
      target: { value: "{}" },
    });

    fireEvent.click(screen.getByRole("radio", { name: "Import Haunt Pack" }));

    expect(screen.getByLabelText("Haunt Pack JSON")).toHaveValue("{}");
  });

  it("keeps the format out of the way until it's opened, then copies it", async () => {
    renderAddHaunt();

    const summary = screen.getByText("View Haunt Pack Format");
    const details = summary.closest("details")!;
    expect(details).not.toHaveAttribute("open");

    fireEvent.click(within(details).getByRole("button", { name: "Copy Schema" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining(`# Haunt Pack format`)),
    );
    expect(writeText.mock.calls[0][0]).toContain(HAUNT_PACK_SCHEMA);
  });
});
