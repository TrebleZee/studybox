import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { loaders } from "./store/appState.js";
import { goTo, renderApp } from "./test/helpers.jsx";
import { mergeData } from "./utils/merge.js";
import { defaultSubjects, normalizeSubjects } from "./utils/subjects.js";

const RECORD_KEYS = ["sb-subjects", "sb-sessions", "sb-tombstones", "sb-game"];
const snapshot = () => Object.fromEntries(RECORD_KEYS.map((key) => [key, localStorage.getItem(key)]));

const session = (id, subjectName, date) => ({
  id,
  subjectId: subjectName.toLowerCase(),
  subjectName,
  subjectColor: "#4F9CF9",
  duration: 1800,
  date,
  note: "",
  tags: [],
  createdAt: date,
  updatedAt: date,
});

// A normal install with a milestone, a ticked topic and two sessions, so
// every kind of delete has something to delete and XP to take away.
const seed = () => {
  const subjects = normalizeSubjects(defaultSubjects());
  subjects[0].topics[1].done = true;
  subjects[0].milestones = [
    { id: "ms-1", name: "NEA draft", kind: "nea", due: null, done: false, createdAt: "2026-09-01T09:00:00.000Z", updatedAt: "2026-09-01T09:00:00.000Z" },
  ];
  localStorage.setItem("sb-subjects", JSON.stringify(normalizeSubjects(subjects)));
  localStorage.setItem(
    "sb-sessions",
    JSON.stringify([
      session("s-new", "Physics", "2026-09-13T09:00:00.000Z"),
      session("s-old", "Maths", "2026-09-12T09:00:00.000Z"),
    ])
  );
  return subjects;
};

const start = () => {
  const subjects = seed();
  const user = userEvent.setup();
  renderApp();
  return { user, subjects, before: snapshot() };
};

const undoBar = () => screen.getByRole("status", { name: /Deleted/ });

describe("undo for deletes", () => {
  it("undoes a session delete, leaving storage exactly as before", async () => {
    const { user, before } = start();
    await goTo(user, "Log");
    await user.click(screen.getByRole("button", { name: "Delete session Maths" }));

    expect(JSON.parse(localStorage.getItem("sb-tombstones")).sessions["s-old"]).toBeTruthy();
    expect(undoBar().textContent).toContain("Deleted Maths.");
    await user.click(within(undoBar()).getByRole("button", { name: "Undo" }));

    expect(snapshot()).toEqual(before);
    expect(screen.queryByRole("status", { name: /Deleted/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Delete session Maths" })).toBeTruthy();
  });

  it("undoes a topic delete, putting it back in its place", async () => {
    const { user, subjects, before } = start();
    const topic = subjects[0].topics[1];
    await user.click(screen.getByRole("button", { name: `Delete topic ${subjects[0].topics[0].name}` }));
    expect(snapshot()).not.toEqual(before);

    await user.click(within(undoBar()).getByRole("button", { name: "Undo" }));
    expect(snapshot()).toEqual(before);
    // The completed topic's XP was never touched, and the order is unchanged.
    expect(JSON.parse(localStorage.getItem("sb-subjects"))[0].topics[1].id).toBe(topic.id);
  });

  it("undoes taking a ticked topic's XP away", async () => {
    const { user, subjects, before } = start();
    await user.click(screen.getByRole("button", { name: /Completed \(1\)/ }));
    const ticked = subjects[0].topics[1].name;
    const xp = JSON.parse(before["sb-game"]).totalXP;
    await user.click(screen.getAllByRole("button", { name: `Delete topic ${ticked}` })[0]);
    expect(JSON.parse(localStorage.getItem("sb-game")).totalXP).toBe(xp - 10);

    await user.click(within(undoBar()).getByRole("button", { name: "Undo" }));
    expect(snapshot()).toEqual(before);
  });

  it("undoes a milestone delete", async () => {
    const { user, before } = start();
    await user.click(screen.getByRole("button", { name: "Delete milestone NEA draft" }));
    expect(undoBar().textContent).toContain("Deleted NEA draft.");

    await user.click(within(undoBar()).getByRole("button", { name: "Undo" }));
    expect(snapshot()).toEqual(before);
  });

  it("undoes a subject delete, restoring it, its place and the selection", async () => {
    const { user, subjects, before } = start();
    await goTo(user, "Settings");
    await user.click(screen.getByRole("button", { name: `Delete subject ${subjects[0].id}` }));
    expect(JSON.parse(localStorage.getItem("sb-subjects")).map((s) => s.id)).not.toContain(subjects[0].id);

    await user.click(within(undoBar()).getByRole("button", { name: "Undo" }));
    expect(snapshot()).toEqual(before);
    await goTo(user, "Planner");
    expect(screen.getByRole("button", { name: `Delete topic ${subjects[0].topics[0].name}` })).toBeTruthy();
  });

  it("restores the timed subject when its delete is undone", async () => {
    const { user, subjects } = start();
    await user.click(screen.getByRole("button", { name: "Start" }));
    await goTo(user, "Settings");
    await user.click(screen.getByRole("button", { name: `Delete subject ${subjects[0].id}` }));
    await user.click(within(undoBar()).getByRole("button", { name: "Undo" }));
    expect(JSON.parse(localStorage.getItem("sb-timer")).timedSubjectId).toBe(subjects[0].id);
  });

  it("keeps the delete, tombstone and all, when it is not undone", async () => {
    const { user, before } = start();
    await goTo(user, "Log");
    await user.click(screen.getByRole("button", { name: "Delete session Maths" }));
    await user.click(within(undoBar()).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status", { name: /Deleted/ })).toBeNull();

    const tombstones = loaders.tombstones();
    expect(tombstones.sessions["s-old"]).toBeTruthy();
    // A copy from before the delete merges as a deletion, not a resurrection.
    const old = JSON.parse(before["sb-sessions"]);
    const merged = mergeData(
      { subjects: loaders.subjects(), sessions: loaders.sessions(), tombstones, game: loaders.game() },
      { subjects: loaders.subjects(), sessions: old, tombstones: { subjects: {}, topics: {}, milestones: {}, sessions: {} }, game: loaders.game() }
    );
    expect(merged.sessions.map((s) => s.id)).toEqual(["s-new"]);
  });

  it("shows one bar: the next delete replaces it, and changing view clears it", async () => {
    const { user } = start();
    await goTo(user, "Log");
    await user.click(screen.getByRole("button", { name: "Delete session Maths" }));
    await user.click(screen.getByRole("button", { name: "Delete session Physics" }));
    expect(screen.getAllByRole("status", { name: /Deleted/ })).toHaveLength(1);
    expect(undoBar().textContent).toContain("Deleted Physics.");

    await goTo(user, "Planner");
    expect(screen.queryByRole("status", { name: /Deleted/ })).toBeNull();
  });

  it("can be reached and used from the keyboard, and Space on it never starts the timer", async () => {
    const { user, before } = start();
    await goTo(user, "Log");
    await user.click(screen.getByRole("button", { name: "Delete session Maths" }));

    const undo = within(undoBar()).getByRole("button", { name: "Undo" });
    for (let i = 0; i < 300 && document.activeElement !== undo; i += 1) await user.tab();
    expect(document.activeElement).toBe(undo);
    await user.keyboard(" ");

    expect(snapshot()).toEqual(before);
    await goTo(user, "Planner");
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
    expect(localStorage.getItem("sb-timer")).toBeNull();
  });
});

const mergeFile = (subjects = []) =>
  new File(
    [
      JSON.stringify({
        version: 3,
        subjects,
        sessions: [session("s-there", "Physics", "2026-09-14T09:00:00.000Z")],
        tombstones: { sessions: { "s-old": "2026-09-14T10:00:00.000Z" } },
        game: { currentStreak: 5, longestStreak: 9, lastStudyDate: "2026-09-14", totalXP: 999, legacyXP: 900 },
      }),
    ],
    "other.json",
    { type: "application/json" }
  );

describe("undo merge", () => {
  it("restores exactly what was here before the merge", async () => {
    const { user, before } = start();
    await goTo(user, "Settings");
    await user.upload(screen.getByLabelText("Merge backup file"), mergeFile());
    expect(await screen.findByText("Backup merged with the data on this device.")).toBeTruthy();
    // The merge lands in state after an await, so its storage write is a passive
    // effect that can run just after the message renders.
    await waitFor(() => expect(snapshot()).not.toEqual(before));

    await user.click(screen.getByRole("button", { name: "Undo merge" }));
    await waitFor(() => expect(snapshot()).toEqual(before));
    expect(screen.queryByRole("button", { name: "Undo merge" })).toBeNull();
  });

  it("is withdrawn once anything changes after the merge, so later work survives", async () => {
    const { user } = start();
    await goTo(user, "Settings");
    await user.upload(screen.getByLabelText("Merge backup file"), mergeFile());
    expect(await screen.findByRole("button", { name: "Undo merge" })).toBeTruthy();

    await goTo(user, "Planner");
    const xp = JSON.parse(localStorage.getItem("sb-game")).totalXP;
    await user.click(screen.getAllByRole("checkbox", { name: /^Complete topic / })[0]);
    const afterTick = snapshot();
    expect(JSON.parse(afterTick["sb-game"]).totalXP).toBe(xp + 10);

    await goTo(user, "Settings");
    expect(screen.queryByRole("button", { name: "Undo merge" })).toBeNull();
    expect(snapshot()).toEqual(afterTick);
  });

  it("stops timing a subject that only the merge added", async () => {
    const { user } = start();
    await goTo(user, "Settings");
    const added = { id: "merged-only", name: "Merged Only", color: "#123456", topics: [] };
    await user.upload(screen.getByLabelText("Merge backup file"), mergeFile([added]));
    expect(await screen.findByRole("button", { name: "Undo merge" })).toBeTruthy();

    await goTo(user, "Planner");
    await user.click(screen.getByRole("button", { name: "Merged Only" }));
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(JSON.parse(localStorage.getItem("sb-timer")).timedSubjectId).toBe("merged-only");

    await goTo(user, "Settings");
    await user.click(screen.getByRole("button", { name: "Undo merge" }));
    expect(JSON.parse(localStorage.getItem("sb-subjects")).some((s) => s.id === "merged-only")).toBe(false);
    expect(JSON.parse(localStorage.getItem("sb-timer")).timedSubjectId).toBeNull();
  });
});
