import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

/**
 * A database holding one haunt nobody wrote code for.
 *
 * Only the three tables the haunt registry reads answer with anything; every
 * other query comes back empty, which is enough for the shell to stand up.
 */
vi.mock("./database/client", () => ({
  DATABASE_URL: "sqlite:test.db",
  getDatabase: () =>
    Promise.resolve({
      select: (sql: string) => {
        if (sql.includes("FROM haunts")) {
          return Promise.resolve([
            {
              id: "frightmare-falls",
              name: "Frightmare Falls",
              short_name: "Frightmare",
              description: null,
              tagline: null,
              accent: "green",
              venues_label: "The Falls",
              sort_order: 0,
              pack_id: "frightmare-falls",
              pack_version: "1.0.0",
              pack_updated_at: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ]);
        }
        if (sql.includes("FROM parks")) {
          return Promise.resolve([
            {
              id: "frightmare-falls:the-falls",
              name: "The Falls",
              haunt_id: "frightmare-falls",
              icon: "trees",
              sort_order: 0,
              pack_id: "frightmare-falls",
            },
          ]);
        }
        if (sql.includes("FROM experience_types")) {
          return Promise.resolve([
            {
              id: "frightmare-falls:type:trail",
              haunt_id: "frightmare-falls",
              category: "walkthrough",
              label_one: "Trail",
              label_many: "Trails",
              description: null,
              sort_order: 0,
              pack_id: "frightmare-falls",
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ]);
        }
        return Promise.resolve([]);
      },
      execute: () => Promise.resolve({ rowsAffected: 0 }),
    }),
}));

describe("App", () => {
  it("renders the app shell with the brand name and the default page", () => {
    render(<App />);

    const sidebar = screen.getByRole("complementary");
    expect(within(sidebar).getByText("Haunt Ranker")).toBeInTheDocument();
    // Home leads with a collection. Which one is data — with no database
    // behind this render there is none, and the page still stands up.
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(within(sidebar).getByRole("radiogroup", { name: "Viewing" })).toBeInTheDocument();
  });

  it("reads the haunts out of the archive, and calls things what they call them", async () => {
    // This asserts the wiring, not the hook: without the registry mounted in
    // the shell, every haunt, venue and word a Haunt Pack brings would be
    // missing from the running app while every test that supplies its own
    // registry still passed. That is exactly the bug this covers.
    render(<App />);

    expect(
      await within(screen.getByRole("complementary")).findByRole("radio", {
        name: "Frightmare Falls",
      }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Trails" })).toBeInTheDocument();
  });
});
