import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the app shell with the brand name and the default page", () => {
    render(<App />);

    const sidebar = screen.getByRole("complementary");
    expect(within(sidebar).getByText("Haunt Ranker")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Haunt Ranker" })).toBeInTheDocument();
  });
});
