import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fmt } from "../utils/format.js";
import useTimer, { ownedElsewhere } from "./useTimer.js";

describe("useTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T09:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  const setup = (props = {}) =>
    renderHook(() => useTimer({ canTime: true, defaultSubjectId: "physics", ...props }));

  it("counts elapsed seconds from a timestamp anchor", () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.displaySecs).toBe(3);
    expect(result.current.running).toBe(true);
    expect(result.current.timedSubjectId).toBe("physics");
  });

  it("stays accurate after the clock jumps (tab backgrounded)", () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => {
      vi.setSystemTime(Date.now() + 10 * 60 * 1000);
      vi.advanceTimersByTime(500);
    });
    expect(result.current.displaySecs).toBe(600);
  });

  it("refreshes immediately when the tab becomes visible again", () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => {
      vi.setSystemTime(Date.now() + 90 * 1000);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.displaySecs).toBe(90);
  });

  it("pauses, resumes without losing time, and resets", () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(5000));
    act(() => result.current.pause());
    expect(result.current.running).toBe(false);
    expect(result.current.displaySecs).toBe(5);

    act(() => vi.advanceTimersByTime(60000));
    expect(result.current.displaySecs).toBe(5);

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.displaySecs).toBe(7);

    act(() => result.current.reset());
    expect(result.current.displaySecs).toBe(0);
    expect(result.current.timedSubjectId).toBeNull();
  });

  it("does not start when nothing can be timed", () => {
    const { result } = setup({ canTime: false });
    act(() => result.current.start());
    expect(result.current.running).toBe(false);
  });
});

describe("useTimer persistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T09:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  const setup = () =>
    renderHook(() => useTimer({ canTime: true, defaultSubjectId: "physics" }));

  it("resumes a running timer after a reload", () => {
    const first = setup();
    act(() => first.result.current.start());
    act(() => vi.advanceTimersByTime(5000));
    first.unmount();

    vi.setSystemTime(Date.now() + 60 * 1000);
    const { result } = setup();
    expect(result.current.running).toBe(true);
    expect(result.current.displaySecs).toBe(65);
    expect(result.current.timedSubjectId).toBe("physics");
  });

  it("restores a paused timer after a reload", () => {
    const first = setup();
    act(() => first.result.current.start());
    act(() => vi.advanceTimersByTime(7000));
    act(() => first.result.current.pause());
    first.unmount();

    const { result } = setup();
    expect(result.current.running).toBe(false);
    expect(result.current.displaySecs).toBe(7);
  });

  it("clears the saved timer on reset", () => {
    const { result } = setup();
    act(() => result.current.start());
    expect(localStorage.getItem("sb-timer")).not.toBeNull();
    act(() => result.current.reset());
    expect(localStorage.getItem("sb-timer")).toBeNull();
  });

  it("ignores a corrupted saved timer", () => {
    localStorage.setItem(
      "sb-timer",
      JSON.stringify({ elapsed: "lots", startedAt: -5, timedSubjectId: 3 })
    );
    const { result } = setup();
    expect(result.current.running).toBe(false);
    expect(result.current.displaySecs).toBe(0);
    expect(result.current.timedSubjectId).toBeNull();
  });

  // R1: a forgotten running timer must not resume with days on the clock.
  it("restores a long-forgotten running timer as paused at the time last seen", () => {
    const first = setup();
    act(() => first.result.current.start());
    act(() => vi.advanceTimersByTime(20 * 60 * 1000));
    first.unmount();

    vi.setSystemTime(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const { result } = setup();
    expect(result.current.running).toBe(false);
    expect(result.current.displaySecs).toBe(20 * 60);
    expect(result.current.timedSubjectId).toBe("physics");
  });

  it("still resumes a running timer closed within the resume window", () => {
    const first = setup();
    act(() => first.result.current.start());
    act(() => vi.advanceTimersByTime(60 * 1000));
    first.unmount();

    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
    const { result } = setup();
    expect(result.current.running).toBe(true);
    expect(result.current.displaySecs).toBe(2 * 60 * 60 + 60);
  });

  it("falls back to the last paused value when there is no heartbeat", () => {
    localStorage.setItem(
      "sb-timer",
      JSON.stringify({ elapsed: 300, startedAt: Date.now() - 5 * 24 * 60 * 60 * 1000, timedSubjectId: "physics" })
    );
    const { result } = setup();
    expect(result.current.running).toBe(false);
    expect(result.current.displaySecs).toBe(300);
  });

  // R4: startedAt 0 and future timestamps pass a plain non-negative check.
  it.each([
    ["at the epoch", 0],
    ["in the future", Date.parse("2026-06-20T09:00:00.000Z")],
  ])("does not resume a timer started %s", (_label, startedAt) => {
    localStorage.setItem(
      "sb-timer",
      JSON.stringify({ elapsed: 42, startedAt, lastSeenAt: startedAt, timedSubjectId: "physics" })
    );
    const { result } = setup();
    expect(result.current.running).toBe(false);
    expect(result.current.displaySecs).toBe(42);
  });

  it("reset returns what it discarded and restore puts a running timer back without the gap", () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(90_000));
    let discarded;
    act(() => {
      discarded = result.current.reset();
    });
    expect(discarded).toEqual({ elapsed: 90, running: true, timedSubjectId: "physics" });
    expect(result.current.displaySecs).toBe(0);
    expect(document.title).toBe("StudyBox");

    act(() => vi.advanceTimersByTime(60_000));
    act(() => result.current.restore(discarded));
    expect(result.current.displaySecs).toBe(90);
    expect(result.current.running).toBe(true);
    expect(result.current.timedSubjectId).toBe("physics");
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.displaySecs).toBe(100);
    expect(document.title).toBe(`${fmt(100)} · StudyBox`);
  });

  it("restore puts a paused timer back paused", () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(30_000));
    act(() => result.current.pause());
    let discarded;
    act(() => {
      discarded = result.current.reset();
    });
    act(() => result.current.restore(discarded));
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current.running).toBe(false);
    expect(result.current.displaySecs).toBe(30);
  });
});

describe("one tab owns the timer (N12)", () => {
  const NOW = Date.parse("2026-06-19T09:00:00.000Z");
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  const setup = () => renderHook(() => useTimer({ canTime: true, defaultSubjectId: "physics" }));
  const stored = () => JSON.parse(localStorage.getItem("sb-timer"));
  const otherTab = (fields) =>
    localStorage.setItem(
      "sb-timer",
      JSON.stringify({ elapsed: 0, startedAt: NOW - 60_000, timedSubjectId: "maths", owner: "tab-other", heldAt: NOW, ...fields })
    );

  it.each([
    ["a live session another tab owns", { owner: "tab-other", heldAt: NOW - 1000 }, 0, true],
    ["this tab's own session", { owner: "tab-me", heldAt: NOW - 1000 }, 0, false],
    ["an owner gone quiet for three minutes", { owner: "tab-other", heldAt: NOW - 3 * 60_000 }, 0, false],
    ["a heartbeat from the future", { owner: "tab-other", heldAt: NOW + 1000 }, 0, false],
    ["a timer saved before owners existed", { owner: undefined, heldAt: undefined }, 0, false],
    ["a released timer, to the reloading page", { owner: null, heldAt: NOW - 1000 }, 0, false],
    ["a released timer, to another tab within the grace", { owner: null, heldAt: NOW - 1000 }, 5000, true],
    ["a timer with nothing on it", { owner: "tab-other", heldAt: NOW, startedAt: null, elapsed: 0 }, 0, false],
  ])("treats %s correctly", (_label, fields, grace, expected) => {
    const saved = { elapsed: 0, startedAt: NOW - 60_000, timedSubjectId: "maths", ...fields };
    expect(ownedElsewhere(saved, "tab-me", NOW, grace)).toBe(expected);
  });

  it("leaves another tab's running timer alone: no copy, no write, no start, no restore", () => {
    otherTab();
    const before = localStorage.getItem("sb-timer");
    const { result } = setup();
    expect(result.current.elsewhere).toBe(true);
    expect(result.current.displaySecs).toBe(0);

    act(() => result.current.start());
    act(() => result.current.restore({ elapsed: 120, running: true, timedSubjectId: "physics" }));
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.running).toBe(false);
    expect(localStorage.getItem("sb-timer")).toBe(before);
  });

  it("stamps its own timer with an owner and a heartbeat, paused too", () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(30_000));
    const owner = stored().owner;
    expect(owner).toMatch(/^tab-/);
    expect(stored().heldAt).toBe(Date.now());

    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(60_000));
    expect(stored()).toMatchObject({ owner, elapsed: 30, startedAt: null, heldAt: Date.now() });
  });

  it("releases its timer on pagehide, and its reload takes it back at once", () => {
    const first = setup();
    act(() => first.result.current.start());
    act(() => vi.advanceTimersByTime(30_000));
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(stored().owner).toBeNull();

    const { result } = setup();
    expect(result.current.elsewhere).toBe(false);
    expect(result.current.running).toBe(true);
    expect(result.current.displaySecs).toBe(30);
    first.unmount();
  });

  it("lets go of its session when another tab continues it", () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(30_000));
    otherTab({ startedAt: NOW, heldAt: Date.now() });
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "sb-timer", newValue: localStorage.getItem("sb-timer"), storageArea: localStorage })
      );
    });
    expect(result.current.elsewhere).toBe(true);
    expect(result.current.running).toBe(false);
    act(() => vi.advanceTimersByTime(10_000));
    expect(stored().owner).toBe("tab-other");
  });
});
