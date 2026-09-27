import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { HauntScopeProvider } from "./HauntScopeProvider";
import { PREFERENCE_KEYS } from "../../preferences/localPreferences";
import { HauntSelector } from "./HauntSelector";
import { Sidebar } from "./Sidebar";
import { TestHaunts } from "../../test/hauntRegistry";

/**
 * The haunt in view is the app's top-level choice: it decides what every
 * page shows and what the app calls it. These cover the two things that
 * would make it feel like an afterthought — forgetting the choice, and
 * using one haunt's vocabulary for the other.
 */
function renderShell() {
  return render(
    <TestHaunts>
      <MemoryRouter>
        <HauntScopeProvider>
          <HauntSelector />
          <Sidebar />
        </HauntScopeProvider>
      </MemoryRouter>
    </TestHaunts>,
  );
}

describe("the haunt selector", () => {
  afterEach(() => {
    window.localStorage.removeItem(PREFERENCE_KEYS.hauntScope);
    window.localStorage.removeItem(PREFERENCE_KEYS.defaultHauntScope);
  });

  it("offers both haunts and All Haunts, with neither haunt buried", () => {
    renderShell();
    const group = within(screen.getAllByRole("radiogroup", { name: "Viewing" })[0]);

    expect(group.getByRole("radio", { name: "All Haunts" })).toBeInTheDocument();
    expect(group.getByRole("radio", { name: "Halloween Horror Nights" })).toBeInTheDocument();
    expect(group.getByRole("radio", { name: "Knott's Scary Farm" })).toBeInTheDocument();
  });

  it("opens on Halloween Horror Nights, the home collection", () => {
    renderShell();

    expect(screen.getAllByRole("radio", { name: "Halloween Horror Nights" })[0]).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("remembers the choice for the next launch", () => {
    const first = renderShell();
    fireEvent.click(screen.getAllByRole("radio", { name: "Knott's Scary Farm" })[0]);

    expect(window.localStorage.getItem(PREFERENCE_KEYS.hauntScope)).toBe("knotts-scary-farm");

    // A fresh mount is what a relaunch looks like: it must not snap back
    // to Halloween Horror Nights, or to All Haunts.
    first.unmount();
    renderShell();
    expect(screen.getAllByRole("radio", { name: "Knott's Scary Farm" })[0]).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("keeps the stored choice when the haunt it names isn't installed", () => {
    // A stored id may belong to a haunt this install no longer holds — a
    // pack can be withdrawn, a backup can come from a machine that had one
    // more. The app reads as the default rather than sitting in a
    // haunt-shaped hole, but what is stored is left alone, so the choice
    // comes back with the haunt.
    window.localStorage.setItem(PREFERENCE_KEYS.hauntScope, "halloween-haunt");
    renderShell();

    expect(screen.getAllByRole("radio", { name: "Halloween Horror Nights" })[0]).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(window.localStorage.getItem(PREFERENCE_KEYS.hauntScope)).toBe("halloween-haunt");
    // And the app speaks a haunt it actually holds.
    expect(screen.getByRole("link", { name: "Houses" })).toBeInTheDocument();
  });

  it("opens on the default chosen in Settings when nothing has been looked at yet", () => {
    window.localStorage.setItem(PREFERENCE_KEYS.defaultHauntScope, "knotts-scary-farm");
    renderShell();

    expect(screen.getAllByRole("radio", { name: "Knott's Scary Farm" })[0]).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("prefers where the reader left off over the default", () => {
    window.localStorage.setItem(PREFERENCE_KEYS.defaultHauntScope, "knotts-scary-farm");
    window.localStorage.setItem(PREFERENCE_KEYS.hauntScope, "all");
    renderShell();

    expect(screen.getAllByRole("radio", { name: "All Haunts" })[0]).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});

describe("navigation vocabulary", () => {
  afterEach(() => {
    window.localStorage.removeItem(PREFERENCE_KEYS.hauntScope);
    window.localStorage.removeItem(PREFERENCE_KEYS.defaultHauntScope);
  });

  it("says Houses & Mazes across both haunts", () => {
    renderShell();
    fireEvent.click(screen.getAllByRole("radio", { name: "All Haunts" })[0]);

    expect(screen.getByRole("link", { name: "Houses & Mazes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Scare Zones" })).toBeInTheDocument();
  });

  it("says Houses at Halloween Horror Nights", () => {
    renderShell();
    fireEvent.click(screen.getAllByRole("radio", { name: "Halloween Horror Nights" })[0]);

    expect(screen.getByRole("link", { name: "Houses" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mazes" })).not.toBeInTheDocument();
  });

  it("says Mazes at Knott's", () => {
    renderShell();
    fireEvent.click(screen.getAllByRole("radio", { name: "Knott's Scary Farm" })[0]);

    expect(screen.getByRole("link", { name: "Mazes" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Houses" })).not.toBeInTheDocument();
    // Scare Zones are called that at both.
    expect(screen.getByRole("link", { name: "Scare Zones" })).toBeInTheDocument();
  });

  it("never shows the database's own word for a walk-through", () => {
    renderShell();
    const nav = screen.getByRole("navigation", { name: "Primary" });

    expect(nav.textContent).not.toMatch(/walkthrough|scare_zone|house_/i);
  });
});
