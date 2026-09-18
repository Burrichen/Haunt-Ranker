import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("renders a link for every primary section", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    const nav = screen.getByRole("navigation", { name: "Primary" });
    ["Home", "Houses", "Scare Zones", "Years", "Rankings", "Statistics", "Settings"].forEach(
      (label) => {
        expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
      },
    );
    expect(nav).toBeInTheDocument();
  });
});
