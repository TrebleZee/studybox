import { act, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { STORAGE_KEYS, subscribe } from "./store/index.js";
import { fmt } from "./utils/format.js";

// Two copies of the app over one localStorage, as the installed PWA beside a
// browser tab are (the harness of App.multiTab.test.jsx): writes are queued
// and delivered to every copy as `storage` events on demand.
let queued = [];
let stopQueueing = () => {};

beforeEach(() => {
  queued = [];
  stopQueueing = subscribe((change) => {
    if (change.type === "write" || change.type === "remove") queued.push(change.key);
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T10:00:00.000Z"));
  localStorage.setItem(STORAGE_KEYS.onboarded, "true");
});

afterEach(() => {
  stopQueueing();
  vi.useRealTimers();
});

const deliver = () => {
  let rounds = 0;
  while (queued.length) {
    rounds += 1;
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

const open = () => {
  const view = render(<App />);
  return { ...within(view.container), unmount: view.unmount };
};
const wait = (ms) => act(() => vi.advanceTimersByTime(ms));
const click = (tab, name) => fireEvent.click(tab.getByRole("button", { name }));
const sessions = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions) ?? "[]");
const storedTimer = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.timer) ?? "null");
const elsewhereNote = (tab) => tab.queryByText(/being timed in another window/);

// A reload as the browser does it: pagehide, then a fresh copy of the app.
const reload = (tab) => {
  act(() => window.dispatchEvent(new Event("pagehide")));
  tab.unmount();
  return open();
};

describe("one tab owns the running timer (N12)", () => {
  // The auditor's scenario: PWA timer, tab opened, session logged in the
  // PWA, PWA reloads. Before the fix the tab's heartbeat put its copy of the
  // timer back after the log, the reload resumed it and it was logged twice.
  it("auditor's scenario stores exactly one session", () => {
    const pwa = open();
    click(pwa, "Start");
    wait(10 * 60 * 1000);
    const tab = open();
    deliver();
    click(pwa, "Log Session");
    deliver();
    wait(5000);
    deliver();

    const reloaded = reload(pwa);
    deliver();
    wait(60_000);
    click(reloaded, "Log Session");
    deliver();
    expect(sessions().map((session) => session.duration)).toEqual([600]);
    expect(tab.getByRole("button", { name: "Log Session" })).toBeTruthy();
  });

  it("stores one session when a tab opened mid-session outlives the session logged in the PWA", () => {
    const pwa = open();
    click(pwa, "Start");
    wait(10 * 60 * 1000);

    // A tab opened while the PWA's timer runs doesn't take a copy of it.
    const tab = open();
    deliver();
    expect(elsewhereNote(tab)).toBeTruthy();
    expect(tab.getByRole("button", { name: "Log Session" }).disabled).toBe(true);

    click(pwa, "Log Session");
    deliver();
    wait(5000);
    deliver();
    expect(sessions()).toHaveLength(1);
    expect(storedTimer()).toBeNull();

    // The PWA reloads: nothing comes back to log a second time.
    const reloaded = reload(pwa);
    deliver();
    expect(reloaded.getByText(fmt(0))).toBeTruthy();
    expect(reloaded.getByRole("button", { name: "Log Session" }).disabled).toBe(true);
    click(reloaded, "Log Session");
    click(tab, "Log Session");
    expect(sessions()).toHaveLength(1);
    expect(sessions()[0].duration).toBe(600);

    // The tab is free to time its own session now the PWA's is logged.
    expect(elsewhereNote(tab)).toBeNull();
    click(tab, "Start");
    wait(60_000);
    click(tab, "Log Session");
    expect(sessions()).toHaveLength(2);
  });

  it("resumes the owner's session after its own reload, and the other tab still doesn't own it", () => {
    const pwa = open();
    click(pwa, "Start");
    wait(5 * 60 * 1000);
    const tab = open();
    deliver();

    const reloaded = reload(pwa);
    deliver();
    wait(60_000);
    deliver();
    expect(reloaded.getByText(fmt(6 * 60))).toBeTruthy();
    expect(elsewhereNote(tab)).toBeTruthy();

    click(reloaded, "Log Session");
    deliver();
    expect(sessions()).toHaveLength(1);
    expect(sessions()[0].duration).toBe(6 * 60);
    expect(elsewhereNote(tab)).toBeNull();
  });

  it("doesn't let a tab start a second timer while another tab's runs", () => {
    const pwa = open();
    const tab = open();
    click(pwa, "Start");
    deliver();
    wait(60_000);

    expect(tab.getByRole("button", { name: "Start" }).disabled).toBe(true);
    expect(elsewhereNote(tab)).toBeTruthy();
    click(pwa, "Log Session");
    deliver();
    expect(sessions()).toHaveLength(1);
    expect(storedTimer()).toBeNull();
  });

  it("moves the session to a tab that continues it, and the old owner stops writing", () => {
    const pwa = open();
    click(pwa, "Start");
    wait(3 * 60 * 1000);
    const tab = open();
    deliver();

    click(tab, "Continue here");
    deliver();
    expect(elsewhereNote(pwa)).toBeTruthy();
    expect(pwa.getByRole("button", { name: "Log Session" }).disabled).toBe(true);
    wait(60_000);
    deliver();
    expect(tab.getByText(fmt(4 * 60))).toBeTruthy();

    click(tab, "Log Session");
    deliver();
    wait(5000);
    deliver();
    expect(storedTimer()).toBeNull();
    const reloaded = reload(pwa);
    deliver();
    expect(reloaded.getByText(fmt(0))).toBeTruthy();
    expect(sessions()).toHaveLength(1);
    expect(sessions()[0].duration).toBe(4 * 60);
  });

  it("picks up a session whose window was killed without saying so, once it has gone quiet", () => {
    // The PWA was killed a minute into a session: no pagehide, no more heartbeats.
    const lastBeat = Date.now();
    localStorage.setItem(
      STORAGE_KEYS.timer,
      JSON.stringify({
        ...{ elapsed: 0, startedAt: lastBeat - 60_000, timedSubjectId: "maths", lastSeenAt: lastBeat },
        ...{ owner: "tab-gone", heldAt: lastBeat },
      })
    );

    const tab = open();
    expect(elsewhereNote(tab)).toBeTruthy();
    wait(2 * 60 * 1000);
    expect(elsewhereNote(tab)).toBeTruthy();
    wait(60 * 1000);
    expect(elsewhereNote(tab)).toBeNull();
    expect(tab.getByText(fmt(4 * 60))).toBeTruthy();
    expect(storedTimer().owner).not.toBe("tab-gone");
    click(tab, "Log Session");
    expect(sessions()).toHaveLength(1);
  });

  it("lets the user continue a killed window's session at once", () => {
    localStorage.setItem(
      STORAGE_KEYS.timer,
      JSON.stringify({ elapsed: 300, startedAt: null, timedSubjectId: "maths", owner: "tab-gone", heldAt: Date.now() })
    );
    const tab = open();
    expect(tab.getByText(fmt(0))).toBeTruthy();
    click(tab, "Continue here");
    expect(elsewhereNote(tab)).toBeNull();
    expect(tab.getByText(fmt(300))).toBeTruthy();
    click(tab, "Log Session");
    expect(sessions().map((session) => [session.subjectId, session.duration])).toEqual([["maths", 300]]);
  });

  it("resumes a timer saved by an older version, which names no owner", () => {
    localStorage.setItem(
      STORAGE_KEYS.timer,
      JSON.stringify({ elapsed: 0, startedAt: Date.now() - 90_000, timedSubjectId: "maths", lastSeenAt: Date.now() })
    );
    const tab = open();
    expect(elsewhereNote(tab)).toBeNull();
    expect(tab.getByText(fmt(90))).toBeTruthy();
  });

  it("withdraws a Reset undo once another tab starts a session, so Undo can't make a second writer", () => {
    const pwa = open();
    const tab = open();
    click(pwa, "Start");
    wait(10 * 60 * 1000);
    click(pwa, "Reset");
    deliver();
    expect(pwa.getByRole("status", { name: /Reset timer/ })).toBeTruthy();

    click(tab, "Start");
    deliver();
    expect(pwa.queryByRole("status", { name: /Reset timer/ })).toBeNull();
    expect(storedTimer().owner).toBeTruthy();
    wait(60_000);
    click(tab, "Log Session");
    deliver();
    expect(sessions()).toHaveLength(1);
    expect(sessions()[0].duration).toBe(60);
  });
});
