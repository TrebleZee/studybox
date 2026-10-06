import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { STORAGE_KEYS, subscribe } from "./store/index.js";
import { renderApp } from "./test/helpers.jsx";
import { fmt } from "./utils/format.js";

// N15: timing a subject that is then deleted (in this tab, another tab, or
// before a timer Reset is undone) must never log the session under another
// subject without the user choosing it.

const HALF_HOUR = 30 * 60;
const stored = (key) => JSON.parse(localStorage.getItem(key)) ?? [];
const deleted = /subject this session was timed on has been deleted/;

const studyPhysics = (tab, seconds = HALF_HOUR) => {
  fireEvent.click(tab.getByRole("button", { name: "Physics" }));
  fireEvent.click(tab.getByRole("button", { name: "Start" }));
  act(() => vi.advanceTimersByTime(seconds * 1000));
};

const deletePhysics = (tab) => {
  fireEvent.click(tab.getByRole("button", { name: "Settings" }));
  fireEvent.click(tab.getByRole("button", { name: "Delete subject physics" }));
};

const chooseSubject = (tab, name) =>
  fireEvent.change(tab.getByRole("combobox", { name: "Log this session under" }), {
    target: { value: tab.getByRole("option", { name }).value },
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-19T09:00:00.000Z"));
});
afterEach(() => vi.useRealTimers());

describe("timed subject deleted in the same tab (N15)", () => {
  it("never logs under another subject until the user chooses one", () => {
    renderApp();
    studyPhysics(screen);
    deletePhysics(screen);
    fireEvent.click(screen.getByRole("button", { name: "Planner" }));

    const log = screen.getByRole("button", { name: "Log Session" });
    fireEvent.click(log);
    expect(stored(STORAGE_KEYS.sessions)).toEqual([]);
    expect(log.disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(deleted);

    // The time is still there, and keeps counting while the user decides.
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText(fmt(HALF_HOUR + 60))).toBeTruthy();

    chooseSubject(screen, "Further Maths");
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    const [logged] = stored(STORAGE_KEYS.sessions);
    expect(logged).toMatchObject({ subjectId: "further", subjectName: "Further Maths", duration: HALF_HOUR + 60 });
  });

  it("a paused session stays unassigned when resumed", () => {
    renderApp();
    studyPhysics(screen);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    deletePhysics(screen);
    fireEvent.click(screen.getByRole("button", { name: "Planner" }));

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    act(() => vi.advanceTimersByTime(60_000));
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    expect(stored(STORAGE_KEYS.sessions)).toEqual([]);
    expect(screen.getByRole("alert").textContent).toMatch(deleted);
  });

  it("Undo of the delete puts the session back on the subject", () => {
    renderApp();
    studyPhysics(screen);
    deletePhysics(screen);
    const bar = screen.getByRole("status", { name: /Deleted Physics/ });
    fireEvent.click(within(bar).getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Planner" }));

    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    expect(stored(STORAGE_KEYS.sessions)[0]).toMatchObject({ subjectId: "physics", duration: HALF_HOUR });
  });

  it("a timer saved without a subject asks too, once it has time on it", () => {
    localStorage.setItem(STORAGE_KEYS.timer, JSON.stringify({ elapsed: 600, startedAt: null }));
    renderApp();
    expect(screen.getByRole("alert").textContent).toMatch(deleted);
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByRole("alert")).toBeTruthy();
    chooseSubject(screen, "Maths");
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    expect(stored(STORAGE_KEYS.sessions)[0]).toMatchObject({ subjectId: "maths", duration: 605 });
  });

  it("a fresh session still times the selected subject", () => {
    renderApp();
    studyPhysics(screen, 60);
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    expect(stored(STORAGE_KEYS.sessions)[0]).toMatchObject({ subjectId: "physics", duration: 60 });
  });
});

// Two copies of the app over one localStorage, as in App.multiTab.test.jsx.
describe("timed subject deleted in another tab (N15)", () => {
  let queued = [];
  let stopQueueing = () => {};
  beforeEach(() => {
    queued = [];
    stopQueueing = subscribe((change) => {
      if (change.type === "write" || change.type === "remove") queued.push(change.key);
    });
  });
  afterEach(() => stopQueueing());

  const deliver = () => {
    for (let rounds = 0; queued.length; rounds += 1) {
      if (rounds > 10) throw new Error("tabs never settled: write loop");
      const keys = queued.splice(0);
      act(() => {
        keys.forEach((key) =>
          window.dispatchEvent(
            new StorageEvent("storage", { key, newValue: localStorage.getItem(key), storageArea: localStorage })
          )
        );
      });
    }
  };

  const openTabs = () => {
    localStorage.setItem(STORAGE_KEYS.onboarded, "true");
    return [within(render(<App />).container), within(render(<App />).container)];
  };

  it("the timing tab never logs under another subject until the user chooses one", () => {
    const [a, b] = openTabs();
    studyPhysics(a);
    deliver();
    deletePhysics(b);
    deliver();

    fireEvent.click(a.getByRole("button", { name: "Log Session" }));
    expect(stored(STORAGE_KEYS.sessions)).toEqual([]);
    expect(a.getByRole("alert").textContent).toMatch(deleted);

    chooseSubject(a, "Computer Science");
    fireEvent.click(a.getByRole("button", { name: "Log Session" }));
    deliver();
    expect(stored(STORAGE_KEYS.sessions)).toHaveLength(1);
    expect(stored(STORAGE_KEYS.sessions)[0]).toMatchObject({ subjectId: "cs", duration: HALF_HOUR });
  });

  it("undoing a timer Reset after the subject was deleted asks too (R2)", () => {
    const [a, b] = openTabs();
    studyPhysics(a);
    fireEvent.click(a.getByRole("button", { name: "Reset" }));
    deliver();
    deletePhysics(b);
    deliver();

    const bar = a.getByRole("status", { name: /Reset timer/ });
    fireEvent.click(within(bar).getByRole("button", { name: "Undo" }));
    expect(a.getByText(fmt(HALF_HOUR))).toBeTruthy();
    fireEvent.click(a.getByRole("button", { name: "Log Session" }));
    expect(stored(STORAGE_KEYS.sessions)).toEqual([]);
    expect(a.getByRole("alert").textContent).toMatch(deleted);

    chooseSubject(a, "Maths");
    fireEvent.click(a.getByRole("button", { name: "Log Session" }));
    expect(stored(STORAGE_KEYS.sessions)[0]).toMatchObject({ subjectId: "maths", duration: HALF_HOUR });
  });
});
