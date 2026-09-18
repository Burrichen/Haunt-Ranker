import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Atmosphere } from "./Atmosphere";

const STORAGE_KEY = "haunt-ranker:ambient-effects";

describe("Atmosphere", () => {
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("renders decorative layers by default", () => {
    const { container } = render(<Atmosphere />);

    expect(container.querySelector(".atmosphere")).not.toBeNull();
  });

  it("renders nothing when the ambient effects preference is disabled", () => {
    window.localStorage.setItem(STORAGE_KEY, "false");

    const { container } = render(<Atmosphere />);

    expect(container.querySelector(".atmosphere")).toBeNull();
  });
});
