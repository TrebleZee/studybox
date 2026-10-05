import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { goTo, renderApp } from "./test/helpers.jsx";
import { defaultSubjects, normalizeSubjects } from "./utils/subjects.js";

// N11: Restore from file replaces everything at once. "Undo restore" puts back
// what was here before, the same way "Undo merge" does.
const ACCOUNT_KEYS = ["sb-subjects", "sb-sessions", "sb-tombstones", "sb-game", "sb-theme"];
const snapshot = () => Object.fromEntries(ACCOUNT_KEYS.map((key) => [key, localStorage.getItem(key)]));

const at = (day) => `2026-09-${day}T10:00:00.000Z`;
const session = (id, subjectName, note, stamp = at(13)) => ({
  id,
  subjectId: subjectName.toLowerCase(),
  subjectName,
  subjectColor: "#4F9CF9",
  duration: 1800,
  date: at(13),
  note,
  tags: [],
  createdAt: at(13),
  updatedAt: stamp,
});

// A normal install: a ticked topic, two sessions, a deleted session, a theme.
const seed = () => {
  const subjects = normalizeSubjects(defaultSubjects());
  subjects[0].topics[1] = { ...subjects[0].topics[1], done: true, updatedAt: at(12) };
  localStorage.setItem("sb-subjects", JSON.stringify(subjects));
  localStorage.setItem(
    "sb-sessions",
    JSON.stringify([session("s-mine", "Physics", "mine"), session("s-only-here", "Maths", "only here")])
  );
  localStorage.setItem(
    "sb-tombstones",
    JSON.stringify({ subjects: {}, topics: {}, milestones: {}, sessions: { "s-gone": at(11) } })
  );
  localStorage.setItem("sb-theme", JSON.stringify("light"));
  return subjects;
};

const backupFile = (body) =>
  new File([JSON.stringify({ version: 3, ...body })], "backup.json", { type: "application/json" });

// The wrong backup: another copy of one session and the first subject, a
// session this device never had, no tombstones, a bigger streak and a theme.
const wrongBackup = (subjects) =>
  backupFile({
    subjects: [{ ...subjects[0], name: "Renamed", updatedAt: at(20) }],
    sessions: [session("s-mine", "Physics", "theirs", at(20)), session("s-file", "Physics", "only in the file")],
    themeId: "dark",
    game: { currentStreak: 40, longestStreak: 40, lastStudyDate: "2026-09-13", totalXP: 5000, legacyXP: 4000 },
  });

const restore = async (user, file) => {
  await user.upload(screen.getByLabelText("Restore backup file"), file);
  expect(await screen.findByText("Backup restored.")).toBeTruthy();
};

const start = async () => {
  const subjects = seed();
  const user = userEvent.setup();
  renderApp();
  // Let mount writes (XP, schema) settle before taking "before".
  await waitFor(() => expect(localStorage.getItem("sb-game")).not.toBeNull());
  return { user, subjects, before: snapshot() };
};

// Storage as it was, except that each record the file had another copy of is
// stamped as edited now, so it wins in a tab that already took the restore (N8).
const withoutStampsOf = (snap, ids) =>
  Object.fromEntries(
    Object.entries(snap).map(([key, text]) => [
      key,
      text &&
        JSON.stringify(
          JSON.parse(text, (k, value) => {
            if (!value || typeof value !== "object" || Array.isArray(value) || !ids.includes(value.id)) return value;
            const rest = { ...value };
            delete rest.updatedAt;
            return rest;
          })
        ),
    ])
  );

describe("undo restore", () => {
  it("puts every account key back as it was before the restore", async () => {
    const { user, subjects, before } = await start();
    await goTo(user, "Settings");
    await restore(user, wrongBackup(subjects));
    await waitFor(() => expect(snapshot()).not.toEqual(before));
    expect(JSON.parse(localStorage.getItem("sb-sessions")).map((s) => s.id)).toEqual(["s-mine", "s-file"]);

    await user.click(screen.getByRole("button", { name: "Undo restore" }));

    await waitFor(() => expect(screen.getByText("Restore undone.")).toBeTruthy());
    const now = snapshot();
    const changed = [subjects[0].id, "s-mine"];
    expect(withoutStampsOf(now, changed)).toEqual(withoutStampsOf(before, changed));
    // Records the file didn't have another copy of are byte-identical, stamps included.
    const others = JSON.parse(now["sb-subjects"]).slice(1);
    expect(JSON.stringify(others)).toBe(JSON.stringify(JSON.parse(before["sb-subjects"]).slice(1)));
    expect(JSON.parse(now["sb-sessions"])[1]).toEqual(JSON.parse(before["sb-sessions"])[1]);
    // The re-stamped ones moved forward.
    changed.forEach((id) => {
      const find = (snap) =>
        [...JSON.parse(snap["sb-subjects"]), ...JSON.parse(snap["sb-sessions"])].find((r) => r.id === id);
      expect(find(now).updatedAt > (find(before).updatedAt || "")).toBe(true);
    });
    expect(screen.queryByRole("button", { name: "Undo restore" })).toBeNull();
  });

  it("is byte-identical when the file shares no record with this device", async () => {
    const { user, before } = await start();
    await goTo(user, "Settings");
    await restore(
      user,
      backupFile({ subjects: [{ id: "other", name: "Other", color: "#123456", topics: [] }], sessions: [] })
    );
    await waitFor(() => expect(snapshot()).not.toEqual(before));

    await user.click(screen.getByRole("button", { name: "Undo restore" }));
    await waitFor(() => expect(snapshot()).toEqual(before));
  });

  it("is withdrawn once anything changes after the restore, so later work survives", async () => {
    const { user, subjects } = await start();
    await goTo(user, "Settings");
    await restore(user, wrongBackup(subjects));
    expect(screen.getByRole("button", { name: "Undo restore" })).toBeTruthy();

    await goTo(user, "Log");
    await user.click(screen.getByRole("button", { name: "Delete session Physics" }));
    await goTo(user, "Settings");
    expect(screen.queryByRole("button", { name: "Undo restore" })).toBeNull();
    expect(screen.getByText("Backup restored.")).toBeTruthy();
  });

  it("is replaced by the next import", async () => {
    const { user, subjects } = await start();
    await goTo(user, "Settings");
    await restore(user, wrongBackup(subjects));
    await user.upload(screen.getByLabelText("Merge backup file"), backupFile({ subjects: [], sessions: [] }));
    expect(await screen.findByText("Backup merged with the data on this device.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Undo restore" })).toBeNull();
    expect(screen.getByRole("button", { name: "Undo merge" })).toBeTruthy();
  });

  it("puts back the selected and timed subject", async () => {
    const { user, subjects } = await start();
    await user.click(screen.getByRole("button", { name: subjects[1].name }));
    await user.click(screen.getByRole("button", { name: "Start" }));
    await user.click(screen.getByRole("button", { name: "Pause" }));
    await goTo(user, "Settings");
    await restore(user, backupFile({ subjects: [{ id: "other", name: "Other", color: "#123456", topics: [] }] }));

    await user.click(screen.getByRole("button", { name: "Undo restore" }));
    expect(JSON.parse(localStorage.getItem("sb-timer")).timedSubjectId).toBe(subjects[1].id);
    await goTo(user, "Planner");
    expect(screen.getByRole("heading", { name: subjects[1].name })).toBeTruthy();
  });

  it("is announced with the message and can be pressed from the keyboard without starting the timer", async () => {
    const { user, subjects, before } = await start();
    await goTo(user, "Settings");
    await restore(user, wrongBackup(subjects));

    const status = screen.getByRole("status", { name: "Backup restored." });
    const undo = within(status).getByRole("button", { name: "Undo restore" });
    for (let i = 0; i < 300 && document.activeElement !== undo; i += 1) await user.tab();
    expect(document.activeElement).toBe(undo);
    await user.keyboard(" ");

    await waitFor(() => expect(screen.getByText("Restore undone.")).toBeTruthy());
    expect(JSON.parse(localStorage.getItem("sb-sessions")).map((s) => s.id)).toEqual(
      JSON.parse(before["sb-sessions"]).map((s) => s.id)
    );
    expect(localStorage.getItem("sb-timer")).toBeNull();
  });

  it("undoes a restore made from onboarding, back to the onboarding screen", async () => {
    const user = userEvent.setup();
    renderApp({ onboarded: false });
    expect(await screen.findByText("Welcome to StudyBox")).toBeTruthy();
    await waitFor(() => expect(localStorage.getItem("sb-subjects")).not.toBeNull());
    const before = snapshot();

    await user.upload(
      screen.getByLabelText("Restore backup file"),
      backupFile({ subjects: [{ id: "other", name: "Other", color: "#123456", topics: [] }], sessions: [] })
    );
    await goTo(user, "Settings");
    expect(screen.getByText("Backup restored.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Undo restore" }));
    expect(await screen.findByText("Welcome to StudyBox")).toBeTruthy();
    await waitFor(() => expect(snapshot()).toEqual(before));
  });
});
