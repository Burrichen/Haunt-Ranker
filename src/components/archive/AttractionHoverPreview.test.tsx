import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Attraction } from "../../models/attraction";
import { AttractionHoverPreview } from "./AttractionHoverPreview";

function makeAttraction(overrides: Partial<Attraction> = {}): Attraction {
  return {
    id: "a1",
    eventYearId: "y1",
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
    debutYear: null,
    parkIds: ["hollywood"],
    isSample: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPreview() {
  const result = render(
    <MemoryRouter>
      <AttractionHoverPreview attraction={makeAttraction()} eventYear={null} rating={null}>
        <a href="/somewhere">Moonlight Manor</a>
      </AttractionHoverPreview>
    </MemoryRouter>,
  );
  // The popup is `role="presentation"` — deliberately hidden from the
  // accessibility tree since it's decorative — so tests check for it
  // directly rather than via `getByRole`.
  const queryPopup = () => result.container.querySelector(".attraction-hover-preview__popup");
  return { ...result, queryPopup };
}

describe("AttractionHoverPreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not show the preview immediately on hover", () => {
    const { queryPopup } = renderPreview();
    fireEvent.mouseEnter(screen.getByText("Moonlight Manor"));
    expect(queryPopup()).not.toBeInTheDocument();
  });

  it("shows the preview after the hover delay elapses", () => {
    const { queryPopup } = renderPreview();
    fireEvent.mouseEnter(screen.getByText("Moonlight Manor"));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(queryPopup()).toBeInTheDocument();
  });

  it("never shows the preview if the pointer leaves before the delay elapses (no flicker)", () => {
    const { queryPopup } = renderPreview();
    const trigger = screen.getByText("Moonlight Manor");
    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.mouseLeave(trigger);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(queryPopup()).not.toBeInTheDocument();
  });

  it("hides the preview immediately when the pointer leaves after it was shown", () => {
    const { queryPopup } = renderPreview();
    const trigger = screen.getByText("Moonlight Manor");
    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(queryPopup()).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    expect(queryPopup()).not.toBeInTheDocument();
  });

  it("keeps the trigger itself as the clickable link to the attraction", () => {
    renderPreview();
    expect(screen.getByRole("link", { name: "Moonlight Manor" })).toHaveAttribute(
      "href",
      "/somewhere",
    );
  });
});
