import { afterEach, describe, expect, it, vi } from "vitest";
import showReminder from "./showReminder.js";

describe("showReminder", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("uses the constructor where it works, and focuses on click", async () => {
    const made = [];
    vi.stubGlobal(
      "Notification",
      class {
        constructor(title, options) {
          this.close = vi.fn();
          made.push({ title, options, self: this });
        }
      }
    );
    vi.spyOn(window, "focus").mockImplementation(() => {});
    await expect(showReminder("Hi", { body: "b" })).resolves.toBe(true);
    expect(made[0].title).toBe("Hi");
    made[0].self.onclick();
    expect(window.focus).toHaveBeenCalled();
    expect(made[0].self.close).toHaveBeenCalled();
  });

  it("falls back to the service worker registration when the constructor throws", async () => {
    vi.stubGlobal("Notification", function () {
      throw new TypeError("Illegal constructor");
    });
    const showNotification = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { serviceWorker: { ready: Promise.resolve({ showNotification }) } });
    await expect(showReminder("Hi", { body: "b" })).resolves.toBe(true);
    expect(showNotification).toHaveBeenCalledWith("Hi", { body: "b" });
  });

  it("resolves false, never rejects, when nothing can show it", async () => {
    vi.stubGlobal("Notification", function () {
      throw new TypeError("Illegal constructor");
    });
    vi.stubGlobal("navigator", {});
    await expect(showReminder("Hi", {})).resolves.toBe(false);
    vi.stubGlobal("navigator", {
      serviceWorker: { ready: Promise.resolve({ showNotification: () => Promise.reject(new Error("x")) }) },
    });
    await expect(showReminder("Hi", {})).resolves.toBe(false);
  });

  it("gives up when no service worker ever becomes ready", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Notification", function () {
      throw new TypeError("Illegal constructor");
    });
    vi.stubGlobal("navigator", { serviceWorker: { ready: new Promise(() => {}) } });
    const result = showReminder("Hi", {});
    await vi.advanceTimersByTimeAsync(3000);
    await expect(result).resolves.toBe(false);
  });
});
