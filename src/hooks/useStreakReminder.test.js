import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_GAME } from "../utils/gameLogic.js";
import { REMINDER_HOUR } from "../utils/reminders.js";
import useStreakReminder from "./useStreakReminder.js";

const atRiskGame = () => ({ ...DEFAULT_GAME, currentStreak: 3, lastStudyDate: "2026-09-14" });

class MockNotification {
  static permission = "default";
  static requestPermission = vi.fn(() => Promise.resolve(MockNotification.permission));
  static instances = [];

  constructor(title, options) {
    this.title = title;
    this.options = options;
    this.close = vi.fn();
    MockNotification.instances.push(this);
  }
}

describe("useStreakReminder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 15, REMINDER_HOUR, 0, 0));
    MockNotification.permission = "default";
    MockNotification.requestPermission.mockClear();
    MockNotification.instances = [];
    vi.stubGlobal("Notification", MockNotification);
    vi.spyOn(window, "focus").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does nothing when Notification is unsupported", () => {
    vi.unstubAllGlobals();
    expect(() => renderHook(() => useStreakReminder(atRiskGame()))).not.toThrow();
    expect(localStorage.getItem("sb-last-streak-reminder")).toBeNull();
  });

  it("requests permission at most once per session, only when the streak is actually at risk", () => {
    renderHook(() => useStreakReminder(atRiskGame()));
    expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(6 * 60 * 1000);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("never prompts when nothing is at risk", () => {
    renderHook(() => useStreakReminder({ ...DEFAULT_GAME }));
    expect(MockNotification.requestPermission).not.toHaveBeenCalled();
  });

  it("shows exactly one notification per day once granted, and focuses on click", () => {
    MockNotification.permission = "granted";
    renderHook(() => useStreakReminder(atRiskGame()));

    expect(MockNotification.instances).toHaveLength(1);
    expect(localStorage.getItem("sb-last-streak-reminder")).toBe('"2026-09-15"');

    MockNotification.instances[0].onclick();
    expect(window.focus).toHaveBeenCalled();
    expect(MockNotification.instances[0].close).toHaveBeenCalled();

    vi.advanceTimersByTime(6 * 60 * 1000);
    expect(MockNotification.instances).toHaveLength(1);
  });

  it("stays silent when permission was denied", () => {
    MockNotification.permission = "denied";
    renderHook(() => useStreakReminder(atRiskGame()));
    expect(MockNotification.requestPermission).not.toHaveBeenCalled();
    expect(MockNotification.instances).toHaveLength(0);
  });
});
