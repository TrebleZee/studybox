import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { goTo, renderApp } from "../test/helpers.jsx";
import { storedBackup } from "./appState.js";
import { STORAGE_KEYS } from "./localStore.js";
import { runMigrations } from "./migrations.js";

// N9, the auditor's scenario: storage written by a newer build (sb-schema 4)
// whose records carry fields this build has never heard of. Mounting must not
// rewrite those keys, and once this build does write (a tick, a logged
// session, a restore, a merge) every unknown field is still there.

const STAMP = "2026-09-01T10:00:00.000Z";

const newerSubjects = () => [
  {
    id: "physics",
    name: "Physics",
    exam: "OCR A",
    color: "#4F9CF9",
    order: 2,
    sharedWith: ["friend-1"],
    createdAt: STAMP,
    updatedAt: STAMP,
    papers: [{ id: "p1", name: "Paper 1", weighting: 0.5 }],
    milestones: [{ id: "m1", name: "Practical", kind: "practical", due: null, done: false, attachments: [] }],
    topics: [
      {
        id: "ph0",
        name: "Forces",
        done: false,
        order: 1,
        notes: "see p.12",
        subtasks: [{ id: "ph0-st0", name: "Read", done: false, weight: 2 }],
        createdAt: STAMP,
        updatedAt: STAMP,
      },
    ],
  },
];

const newerSessions = () => [
  {
    id: "s1",
    subjectId: "physics",
    subjectName: "Physics",
    subjectColor: "#4F9CF9",
    duration: 1800,
    date: STAMP,
    note: "",
    tags: [],
    topicId: "ph0",
    createdAt: STAMP,
    updatedAt: STAMP,
  },
];

const text = (key) => localStorage.getItem(key);
const stored = (key) => JSON.parse(text(key));

const seed = (schema) => {
  localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(newerSubjects()));
  localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(newerSessions()));
  if (schema) localStorage.setItem(STORAGE_KEYS.schema, String(schema));
  runMigrations();
};

const expectUnknownFields = (subjects, sessions) => {
  const subject = subjects.find((s) => s.id === "physics");
  expect(subject).toMatchObject({ order: 2, sharedWith: ["friend-1"] });
  expect(subject.papers[0].weighting).toBe(0.5);
  expect(subject.milestones[0].attachments).toEqual([]);
  expect(subject.topics[0]).toMatchObject({ id: "ph0", order: 1, notes: "see p.12" });
  expect(subject.topics[0].subtasks[0].weight).toBe(2);
  expect(sessions.find((s) => s.id === "s1").topicId).toBe("ph0");
};

const newerFile = () =>
  new File(
    [JSON.stringify({ version: 3, subjects: newerSubjects(), sessions: newerSessions(), tombstones: {} })],
    "newer.json",
    { type: "application/json" }
  );

afterEach(() => {
  // Later test files start from a clean store; this one must not leave the
  // "newer schema" flag behind for its own later cases either.
  localStorage.clear();
  runMigrations();
});

describe("fields written by a newer build (N9)", () => {
  it("are left exactly as stored on mount when sb-schema is newer, and kept when this build then writes", () => {
    seed(4);
    const before = { subjects: text(STORAGE_KEYS.subjects), sessions: text(STORAGE_KEYS.sessions) };

    renderApp();
    expect(text(STORAGE_KEYS.subjects)).toBe(before.subjects);
    expect(text(STORAGE_KEYS.sessions)).toBe(before.sessions);
    expect(text(STORAGE_KEYS.schema)).toBe("4");

    fireEvent.click(screen.getByRole("checkbox", { name: "Complete topic Forces" }));
    expect(stored(STORAGE_KEYS.subjects)[0].topics[0].done).toBe(true);
    expectUnknownFields(stored(STORAGE_KEYS.subjects), stored(STORAGE_KEYS.sessions));
    // A key this build has not changed is still not rewritten.
    expect(text(STORAGE_KEYS.sessions)).toBe(before.sessions);
  });

  it("survive the mount rewrite at this build's schema, and logging a session", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T10:00:00.000Z"));
    seed(null);

    renderApp();
    expectUnknownFields(stored(STORAGE_KEYS.subjects), stored(STORAGE_KEYS.sessions));

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(60 * 1000));
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    expect(stored(STORAGE_KEYS.sessions)).toHaveLength(2);
    expectUnknownFields(stored(STORAGE_KEYS.subjects), stored(STORAGE_KEYS.sessions));
  });

  it("survive Restore from file", async () => {
    const user = userEvent.setup();
    renderApp();
    await goTo(user, "Settings");
    await user.upload(screen.getByLabelText("Restore backup file"), newerFile());
    expect(await screen.findByText(/restored/i)).toBeTruthy();
    // The message renders before the persist effects write storage.
    await waitFor(() => expectUnknownFields(stored(STORAGE_KEYS.subjects), stored(STORAGE_KEYS.sessions)));
  });

  it("survive Merge from file", async () => {
    const user = userEvent.setup();
    renderApp();
    await goTo(user, "Settings");
    await user.upload(screen.getByLabelText("Merge backup file"), newerFile());
    expect(await screen.findByText("Backup merged with the data on this device.")).toBeTruthy();
    await waitFor(() => expectUnknownFields(stored(STORAGE_KEYS.subjects), stored(STORAGE_KEYS.sessions)));
  });

  it("are in the backup built straight from storage", () => {
    seed(4);
    const backup = storedBackup();
    expectUnknownFields(backup.subjects, backup.sessions);
  });
});
