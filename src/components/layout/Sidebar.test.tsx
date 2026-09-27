import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Sidebar } from "./Sidebar";
import { TestHaunts } from "../../test/hauntRegistry";

describe("Sidebar", () => {
  it("renders a link for every primary section", () => {
    render(
      <TestHaunts>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </TestHaunts>,
    );

    const nav = screen.getByRole("navigation", { name: "Primary" });
    // The walkthrough link spans both haunts, so it carries neither haunt's word.
    [
      "Home",
      "Haunts",
      // Halloween Horror Nights is the default collection, so the
      // walkthrough link carries its word for them.
      "Houses",
      "Scare Zones",
      "Years",
      "Rankings",
      "Statistics",
      "Settings",
    ].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
    expect(nav).toBeInTheDocument();
  });
});
