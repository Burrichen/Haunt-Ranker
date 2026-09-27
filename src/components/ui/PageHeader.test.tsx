import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";
import { TestHaunts } from "../../test/hauntRegistry";

describe("PageHeader", () => {
  it("renders the title, subtitle and a back button when backTo is set", () => {
    render(
      <TestHaunts>
        <MemoryRouter>
          <PageHeader title="Houses" subtitle="Browse houses." backTo="/" />
        </MemoryRouter>
      </TestHaunts>,
    );

    expect(screen.getByRole("heading", { name: "Houses" })).toBeInTheDocument();
    expect(screen.getByText("Browse houses.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("omits the nav row when there is no back link or breadcrumb", () => {
    render(
      <TestHaunts>
        <MemoryRouter>
          <PageHeader title="Settings" />
        </MemoryRouter>
      </TestHaunts>,
    );

    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
  });
});
