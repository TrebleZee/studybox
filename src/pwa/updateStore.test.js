import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyUpdate,
  isUpdateReady,
  markUpdateReady,
  subscribeToUpdates,
  watchForUpdates,
} from "./updateStore.js";

describe("update store", () => {
  it("notifies subscribers and exposes the apply function once an update is ready", () => {
    const listener = vi.fn();
    const apply = vi.fn();
    subscribeToUpdates(listener);

    expect(isUpdateReady()).toBe(false);
    markUpdateReady(apply);

    expect(isUpdateReady()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    applyUpdate();
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("does nothing when applied with no update pending", () => {
    expect(() => applyUpdate()).not.toThrow();
  });
});

describe("watchForUpdates", () => {
  let stop;
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    stop?.();
    vi.restoreAllMocks();
  });

  const fakeRegistration = () => ({ update: vi.fn(() => Promise.resolve()) });

  it("checks for a new version on an interval", () => {
    const registration = fakeRegistration();
    stop = watchForUpdates(registration, 1000);

    expect(registration.update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(registration.update).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    expect(registration.update).toHaveBeenCalledTimes(3);
  });

  it("checks when the app comes back to the foreground", () => {
    const registration = fakeRegistration();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    stop = watchForUpdates(registration, 1000);

    document.dispatchEvent(new Event("visibilitychange"));
    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it("skips checks while offline", () => {
    const registration = fakeRegistration();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    stop = watchForUpdates(registration, 1000);

    vi.advanceTimersByTime(3000);
    expect(registration.update).not.toHaveBeenCalled();
  });

  it("stops checking once disposed", () => {
    const registration = fakeRegistration();
    watchForUpdates(registration, 1000)();

    vi.advanceTimersByTime(3000);
    expect(registration.update).not.toHaveBeenCalled();
  });

  it("ignores a missing registration", () => {
    expect(() => watchForUpdates(undefined)()).not.toThrow();
  });
});
