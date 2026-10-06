import { act, fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App.jsx";
import { STORAGE_KEYS, subscribe } from "./store/index.js";
import { defaultSubjects, normalizeSubjects } from "./utils/subjects.js";

// N10: Restore, Start blank, Use template and Choose my subjects replace whole
// lists. Whatever they remove is tombstoned, so a merge (another tab now, sync
// later) can't bring it back; the untouched placeholder defaults are not the
// user's data and leave no tombstones.
//
// Two copies of the app over one localStorage, as in App.multiTab.test.jsx:
// writes are queued and delivered as `storage` events on demand.
let queued = [];
let stopQueueing = () => {};

beforeEach(() => {
  queued = [];
  stopQueueing = subscribe((change) => {
    if (change.type === "write" || change.type === "remove") queued.push(change.key);
  });
});

afterEach(() => stopQueueing());

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

const openTabs = () => [within(render(<App />).container), within(render(<App />).container)];
const stored = (key) => JSON.parse(localStorage.getItem(key));
const subjectIds = () => (stored(STORAGE_KEYS.subjects) || []).map((subject) => subject.id);
const shownSubjects = (tab) =>
  tab.queryAllByRole("button").filter((button) => /\(\d+\/\d+\)|^Delete subject/.test(button.textContent));
const loggedIn = (tab) => {
  fireEvent.click(tab.getByRole("button", { name: "Log" }));
  const count = tab.queryAllByRole("button", { name: /^Edit session / }).length;
  fireEvent.click(tab.getByRole("button", { name: "Planner" }));
  return count;
};
const noSubjectTombstones = () => expect(stored(STORAGE_KEYS.tombstones)?.subjects ?? {}).toEqual({});

const at = (day) => `2026-09-${day}T10:00:00.000Z`;
const session = (id, note, stamp = at(13)) => ({
  id,
  subjectId: "physics",
  subjectName: "Physics",
  subjectColor: "#4F9CF9",
  duration: 600,
  date: at(13),
  note,
  tags: [],
  createdAt: at(13),
  updatedAt: stamp,
});

const upload = async (tab, body, { settings = true } = {}) => {
  if (settings) fireEvent.click(tab.getByRole("button", { name: "Settings" }));
  fireEvent.change(tab.getByLabelText("Restore backup file"), {
    target: { files: [new File([JSON.stringify(body)], "backup.json", { type: "application/json" })] },
  });
  if (settings) await tab.findByText(/^Backup (restored|merged)/);
  else await waitFor(() => expect(tab.queryByLabelText("Restore backup file")).toBeNull());
  await act(async () => {});
};

// An onboarded install with real work in it: a ticked topic and a session.
const seedInstall = () => {
  const subjects = normalizeSubjects(defaultSubjects());
  subjects[0].topics[0] = { ...subjects[0].topics[0], done: true, updatedAt: at(12) };
  localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(subjects));
  localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([session("sess-current", "here")]));
  localStorage.setItem(STORAGE_KEYS.onboarded, "true");
  return subjects;
};

describe("restore with a second tab open (N10)", () => {
  it("ends with only the file's records in both tabs", async () => {
    seedInstall();
    const [a, b] = openTabs();
    queued.splice(0);

    await upload(a, { version: 3, subjects: [], sessions: [session("sess-from-file", "file")] });
    deliver();
    // Tab B writes again from its own (pre-restore) state.
    fireEvent.click(b.getByRole("button", { name: "Settings" }));
    fireEvent.click(b.getByRole("button", { name: "Planner" }));
    deliver();

    expect(subjectIds()).toEqual([]);
    expect(stored(STORAGE_KEYS.sessions).map((s) => s.id)).toEqual(["sess-from-file"]);
    [a, b].forEach((tab) => {
      expect(loggedIn(tab)).toBe(1);
      expect(tab.queryAllByRole("checkbox")).toHaveLength(0);
    });
    const tombstones = stored(STORAGE_KEYS.tombstones);
    expect(Object.keys(tombstones.subjects).sort()).toEqual(defaultSubjects().map((s) => s.id).sort());
    expect(Object.keys(tombstones.sessions)).toEqual(["sess-current"]);
  });

  it("keeps the file's copy of a record this device has a newer copy of", async () => {
    const subjects = seedInstall();
    const [a, b] = openTabs();
    queued.splice(0);

    // An older backup of the same profile: the topic not yet ticked, the session's older note.
    const older = { ...subjects[0], topics: [{ ...subjects[0].topics[0], done: false, updatedAt: at(10) }] };
    await upload(a, { version: 3, subjects: [older], sessions: [session("sess-current", "older", at(10))] });
    deliver();

    const [physics] = stored(STORAGE_KEYS.subjects);
    expect(subjectIds()).toEqual([subjects[0].id]);
    expect(physics.topics.map((t) => [t.id, t.done])).toEqual([[subjects[0].topics[0].id, false]]);
    expect(stored(STORAGE_KEYS.sessions).map((s) => s.note)).toEqual(["older"]);
    [a, b].forEach((tab) => expect(tab.queryAllByRole("checkbox", { checked: true })).toHaveLength(0));
  });
});

describe("restoring a backup from before tombstones (pre-v3)", () => {
  it("keeps this device's tombstones, so a later merge does not bring deleted records back", async () => {
    seedInstall();
    localStorage.setItem(
      STORAGE_KEYS.tombstones,
      JSON.stringify({ subjects: {}, topics: {}, milestones: {}, sessions: { "sess-gone": at(11) } })
    );
    const [a] = openTabs();

    await upload(a, { version: 2, subjects: [], sessions: [session("sess-from-file", "file")] });
    expect(stored(STORAGE_KEYS.tombstones).sessions["sess-gone"]).toBe(at(11));

    // Merge an older copy that still has the deleted session.
    fireEvent.change(a.getByLabelText("Merge backup file"), {
      target: {
        files: [
          new File([JSON.stringify({ version: 2, sessions: [session("sess-gone", "deleted", at(10))] })], "old.json"),
        ],
      },
    });
    await a.findByText("Backup merged with the data on this device.");
    expect(stored(STORAGE_KEYS.sessions).map((s) => s.id)).toEqual(["sess-from-file"]);
  });
});

describe("onboarding with a second tab on the onboarding screen (N10)", () => {
  it("Start blank leaves no subjects in either tab, and no tombstones for the placeholders", async () => {
    const [a, b] = openTabs();
    // The placeholder defaults are not written before onboarding is dismissed.
    expect(localStorage.getItem(STORAGE_KEYS.subjects)).toBeNull();
    queued.splice(0);

    fireEvent.click(a.getByRole("button", { name: /Start blank/ }));
    deliver();

    expect(subjectIds()).toEqual([]);
    noSubjectTombstones();
    [a, b].forEach((tab) => {
      expect(tab.queryByRole("button", { name: /Start blank/ })).toBeNull();
      expect(tab.queryAllByRole("checkbox")).toHaveLength(0);
    });
  });

  it("Use template leaves only the template's subjects in both tabs", async () => {
    const [a, b] = openTabs();
    queued.splice(0);

    fireEvent.click(a.getByRole("button", { name: /Use GCSE core subjects/ }));
    await a.findByRole("button", { name: /Settings/ }, { timeout: 5000 });
    await act(async () => {});
    deliver();

    const ids = subjectIds();
    expect(ids).toHaveLength(4);
    expect(ids.some((id) => defaultSubjects().some((s) => s.id === id))).toBe(false);
    noSubjectTombstones();
    expect(b.queryByRole("button", { name: /Start blank/ })).toBeNull();
    expect(shownSubjects(a).length).toBe(shownSubjects(b).length);
  });

  it("restore from onboarding leaves only the file's subjects in both tabs", async () => {
    const [a, b] = openTabs();
    queued.splice(0);

    const bio = { id: "bio", name: "Biology", color: "#00ff00", topics: [] };
    await upload(a, { version: 3, subjects: [bio], sessions: [] }, { settings: false });
    deliver();

    expect(subjectIds()).toEqual(["bio"]);
    noSubjectTombstones();
    [a, b].forEach((tab) => expect(tab.getAllByRole("button", { name: /Biology/ }).length).toBeGreaterThan(0));
  });
});
