import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScoreMeter } from "./ScoreMeter";

function renderMeter(value: number, onChange = vi.fn()) {
  // Scoped to this render's own container so a test can mount more than one
  // meter without the queries colliding.
  const { container } = render(<ScoreMeter label="Theme" value={value} onChange={onChange} />);
  return { onChange, group: within(container).getByRole("radiogroup", { name: "Theme" }) };
}

describe("ScoreMeter", () => {
  it("shows the current value to one decimal so half-steps are unambiguous", () => {
    render(<ScoreMeter label="Theme" value={3.5} onChange={vi.fn()} />);
    expect(screen.getByText("3.5")).toBeInTheDocument();

    render(<ScoreMeter label="Fun" value={4} onChange={vi.fn()} />);
    expect(screen.getByText("4.0")).toBeInTheDocument();
  });

  it("offers every valid value including 0 — eleven stops in all", () => {
    const { group } = renderMeter(0);
    expect(within(group).getAllByRole("radio")).toHaveLength(11);
    expect(within(group).getByRole("radio", { name: "0.0" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "5.0" })).toBeInTheDocument();
  });

  it("marks only the current value as checked", () => {
    const { group } = renderMeter(2.5);
    expect(within(group).getByRole("radio", { name: "2.5" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "3.0" })).not.toBeChecked();
  });

  it("selects a half-step when its segment is clicked", () => {
    const { onChange, group } = renderMeter(0);
    fireEvent.click(within(group).getByRole("radio", { name: "3.5" }));
    expect(onChange).toHaveBeenCalledWith(3.5);
  });

  it("can be set back to 0 by clicking the zero stop", () => {
    const { onChange, group } = renderMeter(4);
    fireEvent.click(within(group).getByRole("radio", { name: "0.0" }));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("steps by a half point with the arrow keys", () => {
    const { onChange, group } = renderMeter(3);

    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(3.5);

    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith(2.5);
  });

  it("jumps to the ends with Home and End", () => {
    const { onChange, group } = renderMeter(2);

    fireEvent.keyDown(group, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith(5);

    fireEvent.keyDown(group, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it("steps by a whole point with PageUp and PageDown", () => {
    const { onChange, group } = renderMeter(2.5);

    fireEvent.keyDown(group, { key: "PageUp" });
    expect(onChange).toHaveBeenLastCalledWith(3.5);

    fireEvent.keyDown(group, { key: "PageDown" });
    expect(onChange).toHaveBeenLastCalledWith(1.5);
  });

  it("does not run past either end of the scale", () => {
    const atMax = renderMeter(5);
    fireEvent.keyDown(atMax.group, { key: "ArrowRight" });
    expect(atMax.onChange).not.toHaveBeenCalled();

    const atMin = renderMeter(0);
    fireEvent.keyDown(atMin.group, { key: "ArrowLeft" });
    expect(atMin.onChange).not.toHaveBeenCalled();
  });

  it("ignores unrelated keys", () => {
    const { onChange, group } = renderMeter(2);
    fireEvent.keyDown(group, { key: "a" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is a static display with no controls when read-only", () => {
    render(<ScoreMeter label="Fear" value={4.5} readOnly />);

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });
});
