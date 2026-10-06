import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyUpdate,
  isUpdateReady,
  markUpdateActive,
  markUpdateReady,
  registerUpdates,
  subscribeToUpdates,
  updateState,
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

// N18: the register client calls onNeedReload in every open tab once any tab
// applies the update.
describe("an update taking control of the page", () => {
  const register = () => {
    const reload = vi.fn();
    const updateSW = vi.fn();
    let options;
    registerUpdates(
      (opts) => {
        options = opts;
        return updateSW;
      },
      { reload }
    );
    return { reload, updateSW, options };
  };

  it("hands the reload to the store instead of the register client", () => {
    const { options } = register();
    expect(options.onNeedReload).toBe(markUpdateActive);
  });

  it("reloads at once a tab that applied the update itself", () => {
    const { reload, updateSW, options } = register();
    options.onNeedRefresh();
    applyUpdate();
    expect(updateSW).toHaveBeenCalledWith(true);
    expect(reload).not.toHaveBeenCalled();

    options.onNeedReload();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("leaves another tab running, marked active, and reloads it when it applies", () => {
    const { reload, updateSW, options } = register();
    const listener = vi.fn();
    subscribeToUpdates(listener);
    options.onNeedRefresh();
    expect(updateState()).toBe("ready");

    options.onNeedReload();
    expect(reload).not.toHaveBeenCalled();
    expect(updateState()).toBe("active");
    expect(isUpdateReady()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);

    // The new version already controls the page, so there's nothing to skip.
    applyUpdate();
    expect(updateSW).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
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
