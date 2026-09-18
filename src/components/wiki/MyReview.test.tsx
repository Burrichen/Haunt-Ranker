import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "../../models/note";
import type { Rating } from "../../models/rating";
import { MyReview } from "./MyReview";

function makeRating(overrides: Partial<Rating> = {}): Rating {
  return {
    id: "r1",
    attractionId: "a1",
    theme: 4,
    fun: 3.5,
    fear: 4.5,
    total: 12,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeNote(note: string): Note {
  return {
    id: "n1",
    attractionId: "a1",
    note,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

interface RenderOptions {
  rating?: Rating | null;
  note?: Note | null;
  onSave?: (...args: unknown[]) => Promise<void>;
  onClear?: () => Promise<void>;
}

function renderReview({
  rating = null,
  note = null,
  onSave = vi.fn().mockResolvedValue(undefined),
  onClear = vi.fn().mockResolvedValue(undefined),
}: RenderOptions = {}) {
  render(
    <MyReview
      attractionName="Moonlight Manor"
      rating={rating}
      note={note}
      onSave={onSave}
      onClear={onClear}
    />,
  );
  return { onSave, onClear };
}

/** The editor and the confirmations are modals, so scope queries to the dialog. */
function dialog() {
  return within(screen.getByRole("dialog"));
}

function setScore(label: string, value: string) {
  fireEvent.click(
    within(screen.getByRole("radiogroup", { name: label })).getByRole("radio", { name: value }),
  );
}

describe("MyReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when the attraction has never been rated", () => {
    it("says Not Rated and offers to rate it — showing no zero scores", () => {
      renderReview();

      expect(screen.getByText("Not Rated")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Rate this attraction/ })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Edit Review/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Clear Rating/ })).not.toBeInTheDocument();
      expect(screen.queryByText("0.0 / 15")).not.toBeInTheDocument();
    });

    it("opens an editor starting at zero with a derived total", () => {
      renderReview();
      fireEvent.click(screen.getByRole("button", { name: /Rate this attraction/ }));

      expect(dialog().getByText("Rate this attraction")).toBeInTheDocument();
      expect(dialog().getByText("0.0 / 15")).toBeInTheDocument();
    });
  });

  describe("when the attraction is already rated", () => {
    it("shows each dimension and the total out of 15", () => {
      renderReview({ rating: makeRating() });

      expect(screen.getByText("12.0 / 15")).toBeInTheDocument();
      expect(screen.getByText("4.0")).toBeInTheDocument();
      expect(screen.getByText("3.5")).toBeInTheDocument();
      expect(screen.getByText("4.5")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Edit Review/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Clear Rating/ })).toBeInTheDocument();
    });

    it("shows the saved note", () => {
      renderReview({ rating: makeRating(), note: makeNote("The finale room was the best part.") });
      expect(screen.getByText("The finale room was the best part.")).toBeInTheDocument();
    });

    it("opens the editor pre-filled with the saved review", () => {
      renderReview({ rating: makeRating(), note: makeNote("Loved it.") });
      fireEvent.click(screen.getByRole("button", { name: /Edit Review/ }));

      expect(dialog().getByText("12.0 / 15")).toBeInTheDocument();
      expect(dialog().getByLabelText("Notes (optional)")).toHaveValue("Loved it.");
      expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
    });
  });

  describe("saving", () => {
    it("saves the chosen half-step scores and note", async () => {
      const { onSave } = renderReview();
      fireEvent.click(screen.getByRole("button", { name: /Rate this attraction/ }));

      setScore("Theme", "4.5");
      setScore("Fun", "3.0");
      setScore("Fear", "0.5");
      fireEvent.change(dialog().getByLabelText("Notes (optional)"), {
        target: { value: "Great set design." },
      });

      fireEvent.click(dialog().getByRole("button", { name: "Save review" }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({ theme: 4.5, fun: 3, fear: 0.5 }, "Great set design.");
      });
    });

    it("updates the total live as scores change, without saving anything yet", () => {
      const { onSave } = renderReview();
      fireEvent.click(screen.getByRole("button", { name: /Rate this attraction/ }));

      setScore("Theme", "2.5");
      expect(dialog().getByText("2.5 / 15")).toBeInTheDocument();

      setScore("Fun", "1.5");
      expect(dialog().getByText("4.0 / 15")).toBeInTheDocument();

      // Moving the meters is draft-only — nothing reaches the database until Save.
      expect(onSave).not.toHaveBeenCalled();
    });

    it("can deliberately save a zero in every dimension", async () => {
      const { onSave } = renderReview();
      fireEvent.click(screen.getByRole("button", { name: /Rate this attraction/ }));
      fireEvent.click(dialog().getByRole("button", { name: "Save review" }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({ theme: 0, fun: 0, fear: 0 }, "");
      });
    });

    it("keeps the editor open with the user's input when saving fails", async () => {
      const onSave = vi.fn().mockRejectedValue(new Error("Database is locked"));
      renderReview({ onSave });

      fireEvent.click(screen.getByRole("button", { name: /Rate this attraction/ }));
      setScore("Theme", "5.0");
      fireEvent.click(dialog().getByRole("button", { name: "Save review" }));

      expect(await screen.findByText("Database is locked")).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(dialog().getByText("5.0 / 15")).toBeInTheDocument();
    });
  });

  describe("discarding edits", () => {
    it("closes straight away when nothing was changed", () => {
      renderReview({ rating: makeRating() });
      fireEvent.click(screen.getByRole("button", { name: /Edit Review/ }));
      fireEvent.click(dialog().getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("asks before throwing away unsaved changes", () => {
      renderReview({ rating: makeRating() });
      fireEvent.click(screen.getByRole("button", { name: /Edit Review/ }));
      setScore("Theme", "1.0");

      fireEvent.click(dialog().getByRole("button", { name: "Cancel" }));

      expect(dialog().getByRole("alert")).toHaveTextContent(/unsaved changes/i);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("asks before throwing away unsaved changes on Escape too", () => {
      renderReview({ rating: makeRating() });
      fireEvent.click(screen.getByRole("button", { name: /Edit Review/ }));
      setScore("Fun", "0.5");

      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(dialog().getByRole("alert")).toHaveTextContent(/unsaved changes/i);
    });

    it("returns to the editor with the edits intact on Keep editing", () => {
      renderReview({ rating: makeRating() });
      fireEvent.click(screen.getByRole("button", { name: /Edit Review/ }));
      setScore("Theme", "1.0");
      fireEvent.click(dialog().getByRole("button", { name: "Cancel" }));

      fireEvent.click(dialog().getByRole("button", { name: "Keep editing" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(dialog().queryByRole("alert")).not.toBeInTheDocument();
      // 1.0 + 3.5 + 4.5 — the edit survived the detour through the warning.
      expect(dialog().getByText("9.0 / 15")).toBeInTheDocument();
    });

    it("closes without saving on Discard changes", () => {
      const { onSave } = renderReview({ rating: makeRating() });
      fireEvent.click(screen.getByRole("button", { name: /Edit Review/ }));
      setScore("Theme", "1.0");
      fireEvent.click(dialog().getByRole("button", { name: "Cancel" }));

      fireEvent.click(dialog().getByRole("button", { name: "Discard changes" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe("clearing", () => {
    it("asks for confirmation and explains it returns to Not Rated", () => {
      renderReview({ rating: makeRating() });
      fireEvent.click(screen.getByRole("button", { name: /Clear Rating/ }));

      expect(dialog().getByText("Clear this rating?")).toBeInTheDocument();
      expect(dialog().getByText(/Not Rated/)).toBeInTheDocument();
    });

    it("clears only on confirmation", async () => {
      const { onClear } = renderReview({ rating: makeRating() });

      fireEvent.click(screen.getByRole("button", { name: /Clear Rating/ }));
      fireEvent.click(dialog().getByRole("button", { name: "Cancel" }));
      expect(onClear).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: /Clear Rating/ }));
      fireEvent.click(dialog().getByRole("button", { name: "Clear rating" }));

      await waitFor(() => expect(onClear).toHaveBeenCalledOnce());
    });
  });
});
