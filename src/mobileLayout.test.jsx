import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCss } from "./utils/appCss.js";
import { THEMES } from "./utils/themes.js";
import { renderApp } from "./test/helpers.jsx";

// N29: on a phone the planner is one pane at a time, the root height follows
// the visible viewport, and form fields are 16px so iOS Safari doesn't zoom.
const NARROW = "(max-width: 720px)";

const stubMatchMedia = (matches) => {
  window.matchMedia = vi.fn((query) => ({
    matches: matches && query === NARROW,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
};

const pane = (name) => document.querySelector(`[data-pane-id="${name}"]`);
const hidden = (name) => getComputedStyle(pane(name)).display === "none";

describe("mobile layout (N29)", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    delete window.matchMedia;
  });

  it("shows one planner pane at a time on a narrow screen, all kept mounted", () => {
    stubMatchMedia(true);
    renderApp();

    const switcher = screen.getByRole("group", { name: "Planner pane" });
    const buttons = within(switcher).getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual(["false", "true", "false"]);

    expect(hidden("subjects")).toBe(true);
    expect(hidden("topics")).toBe(false);
    expect(hidden("timer")).toBe(true);
    // Hidden panes stay in the DOM: their unsaved text and timer controls survive.
    expect(screen.getByRole("button", { name: "Start", hidden: true })).toBeTruthy();

    fireEvent.click(within(switcher).getByRole("button", { name: /Timer/ }));
    expect(hidden("timer")).toBe(false);
    expect(hidden("topics")).toBe(true);

    fireEvent.click(within(switcher).getByRole("button", { name: "Subjects" }));
    expect(hidden("subjects")).toBe(false);
  });

  it("selecting a subject switches to the topics pane", () => {
    stubMatchMedia(true);
    renderApp();
    const switcher = screen.getByRole("group", { name: "Planner pane" });
    fireEvent.click(within(switcher).getByRole("button", { name: "Subjects" }));
    fireEvent.click(within(pane("subjects")).getByRole("button", { name: "Maths" }));
    expect(hidden("topics")).toBe(false);
    expect(hidden("subjects")).toBe(true);
  });

  it("shows the running time on the Timer switch button", () => {
    vi.useFakeTimers();
    try {
      stubMatchMedia(true);
      renderApp();
      fireEvent.click(screen.getByRole("button", { name: "Start", hidden: true }));
      act(() => vi.advanceTimersByTime(65000));
      const timerButton = within(screen.getByRole("group", { name: "Planner pane" })).getByRole("button", {
        name: /Timer/,
      });
      expect(timerButton.textContent).toMatch(/01:05/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the desktop planner exactly as it was: no switch, every pane shown", () => {
    stubMatchMedia(false);
    renderApp();
    expect(screen.queryByRole("group", { name: "Planner pane" })).toBeNull();
    for (const name of ["subjects", "topics", "timer"]) expect(hidden(name)).toBe(false);
  });

  it("does not throw where matchMedia is missing (jsdom)", () => {
    expect(window.matchMedia).toBeUndefined();
    renderApp();
    expect(screen.queryByRole("group", { name: "Planner pane" })).toBeNull();
  });

  it("sizes the root to the visible viewport, with a 100vh fallback", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).toMatch(/#root\s*\{[^}]*height:\s*100vh;\s*height:\s*100dvh/);
    expect(html).not.toMatch(/id="root"\s+style="[^"]*100vh/);

    const css = buildCss(THEMES[0].colors);
    expect(css).toMatch(/\.app-root\s*\{[^}]*height:\s*100vh;\s*height:\s*100dvh/);

    renderApp();
    const root = document.querySelector(".app-root");
    expect(root).toBeTruthy();
    expect(root.style.height).toBe("");
  });

  it("uses 16px form fields on narrow screens only", () => {
    const css = buildCss(THEMES[0].colors);
    expect(css).toMatch(/input, textarea \{ font-family: inherit; font-size: 13px; \}/);
    const narrow = css.slice(css.indexOf("@media (max-width: 720px)"));
    expect(narrow).toMatch(/input, textarea, select \{[^}]*font-size: 16px/);
  });
});
