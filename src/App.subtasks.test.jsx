import { act, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { STORAGE_KEYS, subscribe } from "./store/index.js";
import { subtaskKey } from "./utils/tombstones.js";

// N19 through the real planner: subtasks are records. Two copies of the app
// over one localStorage, as two tabs are, with `storage` events delivered on
// demand (as in App.multiTab.test.jsx) so one tab can act on stale state.
let queued = [];
let stopQueueing = () => {};

beforeEach(() => {
  queued = [];
  stopQueueing = subscribe((change) => {
    if (change.type === "write" || change.type === "remove") queued.push(change.key);
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-06T10:00:00.000Z"));
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
        window.dispatchEvent(new StorageEvent("storage", { key, newValue: localStorage.getItem(key), storageArea: localStorage }))
      );
    });
  }
};

const OLD = "2026-09-01T09:00:00.000Z";
const seed = () => {
  localStorage.setItem(STORAGE_KEYS.onboarded, "true");
  localStorage.setItem(
    STORAGE_KEYS.subjects,
    JSON.stringify([
      {
        id: "physics",
        name: "Physics",
        color: "#4F9CF9",
        topics: [
          {
            id: "kin",
            name: "Kinematics",
            done: false,
            createdAt: OLD,
            updatedAt: OLD,
            subtasks: [
              { id: "st-old", name: "Read notes", done: false },
              { id: "st-keep", name: "Past paper", done: false },
            ],
          },
        ],
      },
    ])
  );
};

const openTabs = () => {
  seed();
  const a = render(<App />);
  const b = render(<App />);
  deliver();
  return [within(a.container), within(b.container)];
};

const stored = (key) => JSON.parse(localStorage.getItem(key));
const kinematics = () => stored(STORAGE_KEYS.subjects)[0].topics[0];
const expand = (tab) => fireEvent.click(tab.getByText("Kinematics"));

const addSubtask = (tab, name) => {
  fireEvent.change(tab.getByPlaceholderText("Add subtask"), { target: { value: name } });
  fireEvent.click(tab.getByRole("button", { name: "Add subtask to Kinematics" }));
};

describe("subtasks are records (N19)", () => {
  it("stamps the subtask an add, tick or delete changes, not its topic, and tombstones a delete", () => {
    const [a] = openTabs();
    expand(a);
    addSubtask(a, "Graphs");
    const added = kinematics().subtasks.find((st) => st.name === "Graphs");
    expect(added.id).toMatch(/^st-/);
    expect(added).toMatchObject({ createdAt: "2026-10-06T10:00:00.000Z", updatedAt: "2026-10-06T10:00:00.000Z" });

    vi.setSystemTime(new Date("2026-10-06T11:00:00.000Z"));
    fireEvent.click(a.getByRole("checkbox", { name: "Complete subtask Past paper" }));
    expect(kinematics().subtasks.find((st) => st.id === "st-keep")).toMatchObject({ done: true, updatedAt: "2026-10-06T11:00:00.000Z" });

    fireEvent.click(a.getByRole("button", { name: "Delete subtask Read notes" }));
    expect(kinematics().subtasks.map((st) => st.id)).toEqual(["st-keep", added.id]);
    expect(stored(STORAGE_KEYS.tombstones).subtasks).toEqual({
      [subtaskKey("physics", "kin", "st-old")]: "2026-10-06T11:00:00.000Z",
    });
    // The topic itself was never edited.
    expect(kinematics().updatedAt).toBe(OLD);
  });

  it("keeps a subtask added in tab A when tab B then ticks the topic from stale state", () => {
    const [a, b] = openTabs();
    expand(a);
    addSubtask(a, "Graphs");
    vi.setSystemTime(new Date("2026-10-06T10:05:00.000Z"));
    fireEvent.click(b.getByRole("checkbox", { name: "Complete topic Kinematics" }));
    deliver();

    expect(kinematics().done).toBe(true);
    expect(kinematics().subtasks.map((st) => st.name)).toEqual(["Read notes", "Past paper", "Graphs"]);
    // Tab B holds it too: its next write keeps the subtask.
    fireEvent.click(b.getByRole("button", { name: /Completed \(1\)/ }));
    vi.setSystemTime(new Date("2026-10-06T10:10:00.000Z"));
    fireEvent.click(b.getByRole("checkbox", { name: "Reopen topic Kinematics" }));
    deliver();
    expect(kinematics().done).toBe(false);
    expect(kinematics().subtasks.map((st) => st.name)).toEqual(["Read notes", "Past paper", "Graphs"]);
  });

  it("does not let tab B's stale topic bring back a subtask tab A deleted", () => {
    const [a, b] = openTabs();
    expand(a);
    fireEvent.click(a.getByRole("button", { name: "Delete subtask Read notes" }));
    vi.setSystemTime(new Date("2026-10-06T10:05:00.000Z"));
    fireEvent.click(b.getByRole("checkbox", { name: "Complete topic Kinematics" }));
    deliver();

    expect(kinematics().done).toBe(true);
    expect(kinematics().subtasks.map((st) => st.id)).toEqual(["st-keep"]);
  });
});
