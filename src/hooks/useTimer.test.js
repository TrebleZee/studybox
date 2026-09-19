import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useTimer from "./useTimer.js";

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
