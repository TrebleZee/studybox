import { act, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { STORAGE_KEYS, subscribe } from "./store/index.js";

// Two copies of the app over one localStorage, as two tabs (or the installed
// PWA beside a tab) are. A real browser fires `storage` in every other tab
// after a write; here writes are queued and delivered on demand, so a test can
// let one "tab" act on stale state before it hears about the other's change.
let queued = [];
let stopQueueing = () => {};

beforeEach(() => {
  queued = [];
  stopQueueing = subscribe((change) => {
    if (change.type === "write" || change.type === "remove") queued.push(change.key);
  });
});

afterEach(() => stopQueueing());

// Delivers every queued change, and anything written in response, until the
// tabs go quiet. Returns how many rounds that took.
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
  return rounds;
};

const openTabs = () => {
  localStorage.setItem(STORAGE_KEYS.onboarded, "true");
  const a = render(<App />);
  const b = render(<App />);
  return [within(a.container), within(b.container)];
};

const logSession = (tab, seconds = 60) => {
  fireEvent.click(tab.getByRole("button", { name: "Start" }));
  act(() => vi.advanceTimersByTime(seconds * 1000));
  fireEvent.click(tab.getByRole("button", { name: "Log Session" }));
};

const stored = (key) => JSON.parse(localStorage.getItem(key));
const loggedIn = (tab) => {
  fireEvent.click(tab.getByRole("button", { name: "Log" }));
  const count = tab.queryAllByRole("button", { name: /^Edit session / }).length;
  fireEvent.click(tab.getByRole("button", { name: "Planner" }));
  return count;
};

describe("two tabs over one storage", () => {
  it("keeps a session logged in tab A when tab B then ticks a topic from stale state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T10:00:00.000Z"));
    const [a, b] = openTabs();

    logSession(a);
    const topic = b.getAllByRole("checkbox")[0].getAttribute("aria-label").replace("Complete topic ", "");
    fireEvent.click(b.getAllByRole("checkbox")[0]);
    deliver();

    expect(stored(STORAGE_KEYS.sessions)).toHaveLength(1);
    const ticked = stored(STORAGE_KEYS.subjects).flatMap((s) => s.topics).find((t) => t.name === topic);
    expect(ticked.done).toBe(true);
    [a, b].forEach((tab) => {
      expect(loggedIn(tab)).toBe(1);
      expect(tab.getByRole("button", { name: /Completed \(1\)/ })).toBeTruthy();
    });
  });

  it("keeps sessions logged in both tabs within the same second", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T10:00:00.000Z"));
    const [a, b] = openTabs();

    logSession(a);
    logSession(b);
    deliver();

    expect(stored(STORAGE_KEYS.sessions)).toHaveLength(2);
    expect(loggedIn(a)).toBe(2);
    expect(loggedIn(b)).toBe(2);
    // XP and streak settle to the same value in both tabs and in storage.
    expect(stored(STORAGE_KEYS.game).totalXP).toBe(2);
    expect(a.getByText("⚡ 2 XP")).toBeTruthy();
    expect(b.getByText("⚡ 2 XP")).toBeTruthy();
  });

  it("does not let tab B's next write resurrect a session deleted in tab A", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T10:00:00.000Z"));
    const old = {
      id: "sess-old",
      subjectId: "maths",
      subjectName: "Maths",
      subjectColor: "#4f8cff",
      duration: 600,
      date: "2026-09-13T10:00:00.000Z",
      note: "",
      tags: [],
      createdAt: "2026-09-13T10:00:00.000Z",
      updatedAt: "2026-09-13T10:00:00.000Z",
    };
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([old]));
    const [a, b] = openTabs();

    fireEvent.click(a.getByRole("button", { name: "Log" }));
    fireEvent.click(a.getByRole("button", { name: "Delete session Maths" }));
    fireEvent.click(a.getByRole("button", { name: "Planner" }));
    logSession(b);
    deliver();

    const sessions = stored(STORAGE_KEYS.sessions);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).not.toBe("sess-old");
    expect(stored(STORAGE_KEYS.tombstones).sessions["sess-old"]).toBeTruthy();
    expect(loggedIn(a)).toBe(1);
    expect(loggedIn(b)).toBe(1);
  });

  it("settles a burst of changes in both tabs without a write loop", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T10:00:00.000Z"));
    const [a, b] = openTabs();

    logSession(a);
    fireEvent.click(b.getAllByRole("checkbox")[1]);
    logSession(b);
    fireEvent.click(a.getAllByRole("checkbox")[0]);
    expect(deliver()).toBeLessThanOrEqual(3);
  });
});

describe("a change from another tab", () => {
  const external = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(
      new StorageEvent("storage", { key, newValue: JSON.stringify(value), storageArea: localStorage })
    );
  };

  const countWrites = (fn) => {
    const writes = {};
    const stop = subscribe((change) => {
      if (change.type === "write") writes[change.key] = (writes[change.key] || 0) + 1;
    });
    act(fn);
    stop();
    return writes;
  };

  it("is shown here and not written straight back", () => {
    localStorage.setItem(STORAGE_KEYS.onboarded, "true");
    const tab = within(render(<App />).container);
    const session = {
      id: "sess-elsewhere",
      subjectId: "maths",
      subjectName: "Maths",
      subjectColor: "#4f8cff",
      duration: 600,
      date: "2026-09-13T10:00:00.000Z",
      note: "",
      tags: [],
      createdAt: "2026-09-13T10:00:00.000Z",
      updatedAt: "2026-09-13T10:00:00.000Z",
    };

    const writes = countWrites(() => external(STORAGE_KEYS.sessions, [session]));

    expect(writes[STORAGE_KEYS.sessions]).toBeUndefined();
    Object.values(writes).forEach((count) => expect(count).toBeLessThanOrEqual(1));
    expect(loggedIn(tab)).toBe(1);
  });

  it("is merged with this tab's own records and written back at most once", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T10:00:00.000Z"));
    localStorage.setItem(STORAGE_KEYS.onboarded, "true");
    const tab = within(render(<App />).container);
    logSession(tab);
    const mine = stored(STORAGE_KEYS.sessions);

    // Another tab, which never saw this session, overwrites the list.
    const theirs = { ...mine[0], id: "sess-theirs" };
    const writes = countWrites(() => external(STORAGE_KEYS.sessions, [theirs]));

    expect(writes[STORAGE_KEYS.sessions]).toBe(1);
    expect(stored(STORAGE_KEYS.sessions).map((s) => s.id).sort()).toEqual([mine[0].id, "sess-theirs"].sort());
  });

  it("takes the other tab's theme, and ignores keys the store does not own", () => {
    localStorage.setItem(STORAGE_KEYS.onboarded, "true");
    render(<App />);
    const seen = [];
    const stop = subscribe((change) => seen.push(change));
    act(() => {
      external(STORAGE_KEYS.theme, "paper");
      external("someone-elses-key", 1);
    });
    stop();
    expect(seen.some((change) => change.key === "someone-elses-key")).toBe(false);
    expect(stored(STORAGE_KEYS.theme)).toBe("paper");
  });
});
