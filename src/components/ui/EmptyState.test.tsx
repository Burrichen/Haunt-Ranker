import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders a title and optional description", () => {
    render(<EmptyState title="No houses yet" description="Come back later." />);

    expect(screen.getByRole("heading", { name: "No houses yet" })).toBeInTheDocument();
    expect(screen.getByText("Come back later.")).toBeInTheDocument();
  });
});
