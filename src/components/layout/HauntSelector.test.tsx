import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { HauntScopeProvider } from "./HauntScopeProvider";
import { PREFERENCE_KEYS } from "../../preferences/localPreferences";
import { HauntSelector } from "./HauntSelector";
import { Sidebar } from "./Sidebar";

/**
 * The haunt in view is the app's top-level choice: it decides what every
 * page shows and what the app calls it. These cover the two things that
 * would make it feel like an afterthought — forgetting the choice, and
 * using one haunt's vocabulary for the other.
 */
function renderShell() {
  return render(
    <MemoryRouter>
      <HauntScopeProvider>
        <HauntSelector />
        <Sidebar />
      </HauntScopeProvider>
    </MemoryRouter>,
  );
}

describe("the haunt selector", () => {
  afterEach(() => {
    window.localStorage.removeItem(PREFERENCE_KEYS.hauntScope);
  });

  it("offers both haunts and All Haunts, with neither haunt buried", () => {
    renderShell();
    const group = within(screen.getAllByRole("radiogroup", { name: "Viewing" })[0]);

    expect(group.getByRole("radio", { name: "All Haunts" })).toBeInTheDocument();
    expect(group.getByRole("radio", { name: "Halloween Horror Nights" })).toBeInTheDocument();
    expect(group.getByRole("radio", { name: "Knott's Scary Farm" })).toBeInTheDocument();
  });

  it("starts on All Haunts rather than one haunt's archive", () => {
    renderShell();

    expect(screen.getAllByRole("radio", { name: "All Haunts" })[0]).toHaveAttribute(
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

  it("ignores a stored value this version doesn't recognise", () => {
    window.localStorage.setItem(PREFERENCE_KEYS.hauntScope, "halloween-haunt");
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
  });

  it("says Houses & Mazes across both haunts", () => {
    renderShell();

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
