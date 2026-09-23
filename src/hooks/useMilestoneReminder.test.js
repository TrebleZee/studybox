import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useMilestoneReminder from "./useMilestoneReminder.js";

const subjects = (due, done = false) => [
  {
    id: "cs",
    name: "Computer Science",
    color: "#fff",
    topics: [],
    milestones: [{ id: "m1", name: "NEA hand-in", kind: "nea", due, done }],
  },
];

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

describe("useMilestoneReminder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2027, 4, 10, 9, 0, 0));
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
    expect(() => renderHook(() => useMilestoneReminder(subjects("2027-05-12")))).not.toThrow();
    expect(localStorage.getItem("sb-last-milestone-reminder")).toBeNull();
  });

  it("asks for permission once per session, and only when a milestone is due soon", () => {
    renderHook(() => useMilestoneReminder(subjects("2027-05-12")));
    expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(6 * 60 * 1000);
    expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("never prompts when nothing is due soon", () => {
    renderHook(() => useMilestoneReminder(subjects("2027-06-30")));
    renderHook(() => useMilestoneReminder(subjects("2027-05-12", true)));
    expect(MockNotification.requestPermission).not.toHaveBeenCalled();
  });

  it("shows one notification per day once granted and records the date", () => {
    MockNotification.permission = "granted";
    renderHook(() => useMilestoneReminder(subjects("2027-05-12")));
    expect(MockNotification.instances).toHaveLength(1);
    expect(MockNotification.instances[0].title).toBe("NEA hand-in is due soon");
    expect(MockNotification.instances[0].options.body).toContain("Computer Science: NEA hand-in (2027-05-12)");
    expect(JSON.parse(localStorage.getItem("sb-last-milestone-reminder"))).toBe("2027-05-10");

    vi.advanceTimersByTime(6 * 60 * 1000);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(MockNotification.instances).toHaveLength(1);

    MockNotification.instances[0].onclick();
    expect(window.focus).toHaveBeenCalled();
  });

  it("stays silent when permission is denied", () => {
    MockNotification.permission = "denied";
    renderHook(() => useMilestoneReminder(subjects("2027-05-12")));
    expect(MockNotification.instances).toHaveLength(0);
    expect(MockNotification.requestPermission).not.toHaveBeenCalled();
  });
});
