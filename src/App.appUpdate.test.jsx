import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { registerSW } from "vite-plugin-pwa/dist/client/build/register.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerUpdates } from "./pwa/updateStore.js";
import { goTo, renderApp } from "./test/helpers.jsx";

// N18: vite-plugin-pwa's register client (prompt mode, as vite.config.js sets
// it) reloads the page on workbox-window's `controlling` event, which fires in
// every open tab once any one of them applies the update. These tests drive
// the real register client against a stand-in for workbox-window.
const workbox = vi.hoisted(() => ({ current: null }));
vi.mock("workbox-window", () => ({
  Workbox: class {
    constructor() {
      this.listeners = new Map();
      this.messageSkipWaiting = vi.fn();
      workbox.current = this;
    }
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(listener);
    }
    dispatch(type, event = {}) {
      [...(this.listeners.get(type) ?? [])].forEach((listener) => listener({ type, ...event }));
    }
    register() {
      return Promise.resolve({ update: () => Promise.resolve() });
    }
  },
}));

const banner = () => screen.queryByText(/A new version of StudyBox is ready/);

let reload;
let navigated;

// The update is downloaded and waiting, as every tab sees it.
const updateWaiting = async () => {
  registerUpdates(registerSW, { reload });
  await waitFor(() => expect(workbox.current).not.toBeNull());
  act(() => workbox.current.dispatch("waiting", { sw: {} }));
};

// Another tab applies the update: the new version takes control of this one.
// The register client reloads with window.location.reload() inside this
// dispatch, which jsdom ignores silently, so `window` is swapped for the
// dispatch only, to see whether it was called.
const appliedElsewhere = () =>
  act(() => {
    const realWindow = globalThis.window;
    const location = { reload: () => navigated.push("reload") };
    vi.stubGlobal("window", new Proxy(realWindow, { get: (target, key) => (key === "location" ? location : Reflect.get(target, key)) }));
    try {
      workbox.current.dispatch("controlling", { isUpdate: true, isExternal: false });
    } finally {
      vi.unstubAllGlobals();
    }
  });

const reloaded = () => reload.mock.calls.length > 0 || navigated.length > 0;

const mergeFile = () =>
  new File(
    [
      JSON.stringify({
        version: 3,
        subjects: [],
        sessions: [
          {
            id: "s-there",
            subjectId: "physics",
            subjectName: "Physics",
            subjectColor: "#38bdf8",
            duration: 600,
            date: "2026-09-14T09:00:00.000Z",
            note: "",
            tags: [],
          },
        ],
      }),
    ],
    "other.json",
    { type: "application/json" }
  );

describe("an update applied in another tab (N18)", () => {
  beforeEach(() => {
    workbox.current = null;
    reload = vi.fn();
    navigated = [];
    Object.defineProperty(navigator, "serviceWorker", { value: {}, configurable: true });
  });
  afterEach(() => {
    delete navigator.serviceWorker;
    vi.restoreAllMocks();
  });

  it("doesn't reload a tab timing a session, and shows the update banner instead", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Start" }));
    await updateWaiting();

    appliedElsewhere();
    expect(reloaded()).toBe(false);
    expect(banner()).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();

    // Updating is still the user's choice, and now takes effect at once.
    await user.click(screen.getByRole("button", { name: "Update now" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("doesn't reload a tab holding the undo of a delete", async () => {
    const user = userEvent.setup();
    localStorage.setItem("sb-timer", JSON.stringify({ elapsed: 120, startedAt: null, timedSubjectId: "physics" }));
    renderApp();
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("status", { name: /Reset timer/ })).toBeTruthy();
    await updateWaiting();

    appliedElsewhere();
    expect(reloaded()).toBe(false);
    expect(banner()).toBeTruthy();
    expect(screen.getByRole("status", { name: /Reset timer/ })).toBeTruthy();
  });

  it("doesn't reload a tab holding Undo merge, even back on the planner", async () => {
    const user = userEvent.setup();
    renderApp();
    await goTo(user, "Settings");
    await user.upload(screen.getByLabelText("Merge backup file"), mergeFile());
    expect(await screen.findByRole("button", { name: "Undo merge" })).toBeTruthy();
    await goTo(user, "Planner");
    await updateWaiting();

    appliedElsewhere();
    expect(reloaded()).toBe(false);
    expect(banner()).toBeTruthy();
    await goTo(user, "Settings");
    expect(screen.getByRole("button", { name: "Undo merge" })).toBeTruthy();
  });

  it("doesn't reload a tab with a session being edited", async () => {
    const user = userEvent.setup();
    localStorage.setItem("sb-sessions", JSON.stringify(JSON.parse(await mergeFile().text()).sessions));
    renderApp();
    await goTo(user, "Log");
    await user.click(screen.getByRole("button", { name: /^Edit/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    await updateWaiting();

    appliedElsewhere();
    expect(reloaded()).toBe(false);
    expect(banner()).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("reloads an idle tab as before", async () => {
    renderApp();
    await updateWaiting();
    // An idle tab applies the update itself as soon as it's ready…
    await waitFor(() => expect(workbox.current.messageSkipWaiting).toHaveBeenCalled());

    // …and reloads once the new version controls it.
    appliedElsewhere();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads a tab once it is no longer busy", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Start" }));
    await updateWaiting();
    appliedElsewhere();
    expect(reloaded()).toBe(false);

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(reloaded()).toBe(false);
    await user.click(screen.getByRole("button", { name: "Log Session" }));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });
});
