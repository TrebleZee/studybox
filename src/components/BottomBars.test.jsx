import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BottomBars from "./BottomBars.jsx";
import UndoBar from "./UndoBar.jsx";
import UpdateBanner from "./UpdateBanner.jsx";
import { renderApp } from "../test/helpers.jsx";
import { THEMES } from "../utils/themes.js";

// N29 follow-up: the undo bar and the update banner share one fixed stack, so
// the raised undo bar can't overlap a banner that wraps to several lines.
const C = THEMES[0].colors;

afterEach(cleanup);

describe("BottomBars", () => {
  it("stacks both bars in one fixed flex column, neither positioned itself", () => {
    render(
      <BottomBars>
        <UndoBar C={C} name="Algebra" onUndo={() => {}} onDismiss={() => {}} />
        <UpdateBanner C={C} onUpdate={() => {}} />
      </BottomBars>,
    );
    const stack = document.querySelector("[data-bottom-bars]");
    expect(stack.style.position).toBe("fixed");
    expect(stack.style.display).toBe("flex");
    expect(stack.style.flexDirection).toBe("column");
    const bars = screen.getAllByRole("status");
    expect(bars).toHaveLength(2);
    for (const bar of bars) {
      expect(bar.parentElement).toBe(stack);
      expect(bar.style.position).toBe("");
      expect(bar.style.bottom).toBe("");
    }
  });

  it("keeps the update banner (and its focus) when the undo bar comes and goes", () => {
    const tree = (undo) => (
      <BottomBars>
        {undo && <UndoBar C={C} name="Algebra" onUndo={() => {}} onDismiss={() => {}} />}
        <UpdateBanner C={C} onUpdate={() => {}} />
      </BottomBars>
    );
    const { rerender } = render(tree(false));
    const button = screen.getByRole("button", { name: "Update now" });
    button.focus();
    rerender(tree(true));
    expect(screen.getByRole("button", { name: "Update now" })).toBe(button);
    expect(document.activeElement).toBe(button);
    rerender(tree(false));
    expect(screen.getByRole("button", { name: "Update now" })).toBe(button);
  });

  it("renders nothing when no bar is showing", () => {
    render(<BottomBars>{false}{null}</BottomBars>);
    expect(document.querySelector("[data-bottom-bars]")).toBeNull();
  });
});

describe("timer tag row", () => {
  it("lets the Add tag input shrink so the Add button stays inside the panel", () => {
    renderApp();
    expect(screen.getByPlaceholderText("Add tag").style.minWidth).toBe("0px");
  });
});
