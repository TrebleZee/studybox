import { describe, expect, it } from "vitest";
import { DEFAULT_GAME } from "./gameLogic.js";
import { mergeData } from "./merge.js";
import { addTombstone, childKey, emptyTombstones, removeTombstone } from "./tombstones.js";
import {
  canUndoImport,
  describeDeletion,
  restoreBeforeMerge,
  restoreDeletion,
  stateAfterRestore,
  stateBeforeImport,
  unchangedSinceMerge,
  unchangedSinceRestore,
} from "./undo.js";

describe("unchangedSinceMerge", () => {
  const after = { subjects: [], sessions: [], tombstones: emptyTombstones(), game: { totalXP: 0 } };
  it("is true only while every merged record list holds what the merge produced", () => {
    expect(unchangedSinceMerge(after, { ...after })).toBe(true);
    expect(unchangedSinceMerge(after, { ...after, sessions: [{ id: "s1" }] })).toBe(false);
    expect(unchangedSinceMerge(after, { ...after, game: { totalXP: 1 } })).toBe(false);
    expect(unchangedSinceMerge(after, { ...after, tombstones: { ...emptyTombstones(), sessions: { s1: at } } })).toBe(false);
    expect(unchangedSinceMerge(undefined, after)).toBe(false);
  });

  // C14: another tab's echo comes back as new objects with the same records.
  it("is still true when the same records come back as new objects, in any key order", () => {
    const merged = {
      subjects: [{ id: "maths", name: "Maths", topics: [{ id: "t1", name: "Algebra", done: true }] }],
      sessions: [{ id: "s1", duration: 60, updatedAt: at }],
      tombstones: emptyTombstones(),
      game: { totalXP: 11, legacyXP: 0 },
    };
    const echoed = JSON.parse(JSON.stringify(merged));
    echoed.game = { legacyXP: 0, totalXP: 11 };
    echoed.subjects[0] = { topics: echoed.subjects[0].topics, name: "Maths", id: "maths" };
    expect(unchangedSinceMerge(merged, echoed)).toBe(true);

    echoed.subjects[0].topics[0].done = false;
    expect(unchangedSinceMerge(merged, echoed)).toBe(false);
  });

});

const at = "2026-09-14T10:00:00.000Z";
const later = "2026-09-14T11:00:00.000Z";
const undoneAt = "2026-09-14T11:05:00.000Z";

// The state as it was, with the restored record stamped as edited at `now`.
const stamped = (s, id, now) =>
  JSON.parse(JSON.stringify(s), (key, value) =>
    value && typeof value === "object" && !Array.isArray(value) && value.id === id ? { ...value, updatedAt: now } : value
  );

const state = () => ({
  subjects: [
    {
      id: "maths",
      name: "Maths",
      topics: [
        { id: "t1", name: "Algebra", done: false, subtasks: [], updatedAt: at },
        { id: "t2", name: "Calculus", done: true, subtasks: [], updatedAt: at },
      ],
      milestones: [{ id: "m1", name: "Mock", kind: "other", due: null, done: false, updatedAt: at }],
    },
    { id: "physics", name: "Physics", topics: [] },
  ],
  sessions: [
    { id: "s1", subjectName: "Maths", updatedAt: at },
    { id: "s2", subjectName: "Physics", updatedAt: at },
  ],
  tombstones: emptyTombstones(),
});

// What the app does on delete, for each kind.
const remove = (s, kind, id, subjectId) => {
  if (kind === "subjects") return { ...s, subjects: s.subjects.filter((x) => x.id !== id), tombstones: addTombstone(s.tombstones, kind, id, later) };
  if (kind === "sessions") return { ...s, sessions: s.sessions.filter((x) => x.id !== id), tombstones: addTombstone(s.tombstones, kind, id, later) };
  return {
    ...s,
    subjects: s.subjects.map((x) => (x.id === subjectId ? { ...x, [kind]: x[kind].filter((r) => r.id !== id) } : x)),
    tombstones: addTombstone(s.tombstones, kind, childKey(subjectId, id), later),
  };
};

describe("removeTombstone", () => {
  it("removes one id and leaves the rest", () => {
    const t = addTombstone(addTombstone(emptyTombstones(), "sessions", "a", at), "sessions", "b", at);
    expect(removeTombstone(t, "sessions", "a")).toEqual({ ...emptyTombstones(), sessions: { b: at } });
    expect(t.sessions.a).toBe(at);
  });

  it("returns the same object when the id has no tombstone, including prototype names", () => {
    const t = emptyTombstones();
    expect(removeTombstone(t, "sessions", "missing")).toBe(t);
    expect(removeTombstone(t, "sessions", "__proto__")).toBe(t);
    expect(removeTombstone(t, "sessions", "toString")).toBe(t);
  });
});

describe("undoing a delete", () => {
  it.each([
    ["subjects", "maths", null],
    ["subjects", "physics", null],
    ["sessions", "s1", null],
    ["sessions", "s2", null],
    ["topics", "t1", "maths"],
    ["topics", "t2", "maths"],
    ["milestones", "m1", "maths"],
  ])("puts a deleted %s record (%s) back in place, stamped now, with no tombstone", (kind, id, subjectId) => {
    const before = state();
    const entry = describeDeletion(before, kind, id, subjectId);
    const after = restoreDeletion(remove(before, kind, id, subjectId), entry, undoneAt);
    expect(JSON.stringify(after)).toBe(JSON.stringify(stamped(before, id, undoneAt)));
  });

  it.each([
    ["subjects", "maths", null],
    ["sessions", "s1", null],
    ["topics", "t1", "maths"],
    ["milestones", "m1", "maths"],
  ])("restores a %s record so it survives a merge with a copy that has the tombstone (N8)", (kind, id, subjectId) => {
    const before = state();
    const entry = describeDeletion(before, kind, id, subjectId);
    const deleted = remove(before, kind, id, subjectId);
    const undone = restoreDeletion(deleted, entry, undoneAt);
    const other = { ...deleted, game: DEFAULT_GAME };
    const merged = mergeData({ ...undone, game: DEFAULT_GAME }, other);
    const ids = JSON.stringify([merged.subjects, merged.sessions]);
    expect(ids).toContain(`"id":"${id}"`);
  });

  it("stamps past the tombstone when Undo lands in the same millisecond as the delete", () => {
    const before = state();
    const entry = describeDeletion(before, "sessions", "s1");
    const undone = restoreDeletion(remove(before, "sessions", "s1"), entry, later);
    expect(undone.sessions[0].updatedAt).toBe("2026-09-14T11:00:00.001Z");
  });

  it("puts a subject's milestones key back in its place when the last milestone was deleted", () => {
    const before = state();
    const entry = describeDeletion(before, "milestones", "m1", "maths");
    // As the normalizer does: no milestones left, no key.
    const deleted = remove(before, "milestones", "m1", "maths");
    const withoutKey = Object.fromEntries(Object.entries(deleted.subjects[0]).filter(([key]) => key !== "milestones"));
    const after = restoreDeletion({ ...deleted, subjects: [withoutKey, deleted.subjects[1]] }, entry, undoneAt);
    expect(JSON.stringify(after)).toBe(JSON.stringify(stamped(before, "m1", undoneAt)));
  });

  it("names what was deleted", () => {
    expect(describeDeletion(state(), "sessions", "s2").name).toBe("Physics");
    expect(describeDeletion(state(), "topics", "t1", "maths").name).toBe("Algebra");
  });

  it("puts back a tombstone the record already had", () => {
    const before = { ...state(), tombstones: addTombstone(emptyTombstones(), "sessions", "s1", at) };
    const entry = describeDeletion(before, "sessions", "s1");
    expect(restoreDeletion(remove(before, "sessions", "s1"), entry).tombstones.sessions.s1).toBe(at);
  });

  it("does not duplicate a record that is already back", () => {
    const before = state();
    const entry = describeDeletion(before, "sessions", "s1");
    expect(restoreDeletion(before, entry).sessions).toHaveLength(2);
  });

  it("ignores ids that are not there", () => {
    expect(describeDeletion(state(), "sessions", "nope")).toBeNull();
    expect(describeDeletion(state(), "topics", "t1", "nope")).toBeNull();
  });
});

describe("undoing a merge", () => {
  const undoMergeAt = "2026-09-21T09:00:00.000Z";
  const fileAt = "2026-09-20T10:00:00.000Z";
  const setup = () => {
    const before = { ...state(), game: DEFAULT_GAME, sel: "maths", timedSubjectId: null };
    const file = {
      subjects: [
        {
          ...before.subjects[0],
          topics: [{ ...before.subjects[0].topics[0], done: true, updatedAt: fileAt }, before.subjects[0].topics[1]],
        },
        { id: "art", name: "Art", topics: [], updatedAt: fileAt },
      ],
      sessions: [{ id: "s1", subjectName: "Maths (theirs)", updatedAt: fileAt }],
      tombstones: { ...emptyTombstones(), sessions: { s2: fileAt } },
      game: DEFAULT_GAME,
    };
    return { before, after: mergeData(before, file) };
  };

  it("restamps only the records the merge changed or removed, past the merged copy", () => {
    const { before, after } = setup();
    const restored = restoreBeforeMerge({ before, after }, undoMergeAt);
    const [maths, physics] = restored.subjects;
    expect(maths.topics[0]).toEqual({ ...before.subjects[0].topics[0], updatedAt: undoMergeAt });
    expect(maths.topics[1]).toBe(before.subjects[0].topics[1]);
    expect(maths.milestones[0]).toBe(before.subjects[0].milestones[0]);
    // A changed topic doesn't stamp its subject.
    expect(maths).not.toHaveProperty("updatedAt");
    expect(physics).toEqual(before.subjects[1]);
    expect(restored.sessions).toEqual([
      { id: "s1", subjectName: "Maths", updatedAt: undoMergeAt },
      { id: "s2", subjectName: "Physics", updatedAt: undoMergeAt },
    ]);
  });

  it("puts back the pre-merge tombstones, game and selection, and tombstones nothing new", () => {
    const { before, after } = setup();
    const restored = restoreBeforeMerge({ before, after }, undoMergeAt);
    expect(restored.tombstones).toBe(before.tombstones);
    expect(restored.game).toBe(before.game);
    expect(restored.sel).toBe("maths");
    expect(restored.subjects.map((s) => s.id)).toEqual(["maths", "physics"]);
  });

  it("wins against a tab that already took the merge, except for records only the file had", () => {
    const { before, after } = setup();
    const restored = restoreBeforeMerge({ before, after }, undoMergeAt);
    const otherTab = mergeData(after, { ...restored, tombstones: after.tombstones });
    expect(otherTab.subjects.find((s) => s.id === "maths").topics[0].done).toBe(false);
    expect(otherTab.sessions.map((s) => [s.id, s.subjectName])).toEqual([
      ["s1", "Maths"],
      ["s2", "Physics"],
    ]);
    expect(otherTab.subjects.some((s) => s.id === "art")).toBe(true);
  });

  it("stamps past the merged copy when the file's stamp is in the future", () => {
    const { before, after } = setup();
    const restored = restoreBeforeMerge({ before, after }, "2026-09-15T00:00:00.000Z");
    expect(restored.sessions[0].updatedAt).toBe("2026-09-20T10:00:00.001Z");
  });
});

// N11: Undo restore.
describe("undoing a restore", () => {
  const nowMs = Date.parse("2026-09-20T12:00:00.000Z");
  const session = (id, note, updatedAt = at) => ({ id, subjectId: "maths", duration: 600, date: at, note, tags: [], updatedAt });
  const subject = { id: "maths", name: "Maths", color: "#123456", topics: [{ id: "t1", name: "Algebra", done: false }] };
  const game = { ...DEFAULT_GAME, legacyXP: 0 };
  const before = {
    subjects: [subject],
    sessions: [session("mine", "mine"), session("only-here", "only here")],
    tombstones: emptyTombstones(),
    game,
    themeId: "dark",
    onboarded: true,
  };
  const file = {
    subjects: [{ ...subject, name: "Renamed", updatedAt: later }],
    sessions: [session("mine", "theirs", later), session("file-only", "from the file")],
    tombstones: emptyTombstones(),
    game: { ...DEFAULT_GAME, totalXP: 500, legacyXP: null },
    themeId: "light",
  };
  const after = stateAfterRestore(file, before);
  const offer = { kind: "restore", before, after };

  it("takes everything from the file, keeping what's here for parts it doesn't carry", () => {
    expect(after.subjects).toBe(file.subjects);
    expect(after.themeId).toBe("light");
    expect(after.game.legacyXP).toBe(500 - 20);
    const partial = stateAfterRestore({ sessions: [] }, before);
    expect(partial.subjects).toBe(before.subjects);
    expect(partial.game).toBe(before.game);
    expect(partial.themeId).toBe("dark");
    expect(partial.tombstones).toEqual(emptyTombstones());
  });

  it("is offered while nothing has changed, and after another tab merges its own records back in", () => {
    expect(canUndoImport(offer, after)).toBe(true);
    const echo = { ...mergeData(after, before, nowMs), themeId: "light" };
    expect(echo.sessions.map((s) => s.id).sort()).toEqual(["file-only", "mine", "only-here"]);
    expect(unchangedSinceRestore(offer, echo, nowMs)).toBe(true);
    // ...in any order.
    expect(unchangedSinceRestore(offer, { ...echo, sessions: [...echo.sessions].reverse() }, nowMs)).toBe(true);
  });

  it("is withdrawn by anything new: a session, an edit, a delete or a theme change", () => {
    const changed = [
      { ...after, sessions: [...after.sessions, session("new", "logged since", undoneAt)] },
      { ...after, sessions: [session("mine", "edited since", undoneAt), after.sessions[1]] },
      { ...after, tombstones: addTombstone(after.tombstones, "sessions", "file-only", undoneAt) },
      { ...after, themeId: "dark" },
    ];
    changed.forEach((state) => expect(unchangedSinceRestore(offer, state, nowMs)).toBe(false));
    expect(unchangedSinceRestore(undefined, after, nowMs)).toBe(false);
  });

  it("puts back what was here, re-stamping only what the file had another copy of", () => {
    const restored = stateBeforeImport(offer, after, undoneAt);
    expect(restored.themeId).toBe("dark");
    expect(restored.onboarded).toBe(true);
    expect(restored.game).toBe(game);
    expect(restored.sessions).toEqual([{ ...before.sessions[0], updatedAt: undoneAt }, before.sessions[1]]);
    expect(restored.subjects).toEqual([{ ...subject, updatedAt: undoneAt }]);
    // The re-stamped copies win against the file's in a tab that took the restore.
    const otherTab = mergeData(after, before, nowMs);
    const settled = mergeData(otherTab, restored, nowMs);
    expect(settled.sessions.find((s) => s.id === "mine").note).toBe("mine");
    expect(settled.subjects[0].name).toBe("Maths");
  });

  it("leaves a record the restore simply dropped exactly as it was", () => {
    const dropped = stateAfterRestore({ subjects: [], sessions: [] }, before);
    const restored = stateBeforeImport({ kind: "restore", before, after: dropped }, dropped, undoneAt);
    expect(restored.subjects).toEqual(before.subjects);
    expect(restored.sessions).toEqual(before.sessions);
  });

  it("re-stamps a record the file tombstoned, past its tombstone", () => {
    const tombstoned = stateAfterRestore(
      { subjects: [subject], sessions: [], tombstones: addTombstone(emptyTombstones(), "sessions", "mine", undoneAt) },
      before
    );
    const restored = stateBeforeImport({ kind: "restore", before, after: tombstoned }, tombstoned, at);
    expect(restored.sessions[0].updatedAt > undoneAt).toBe(true);
    expect(restored.sessions[1]).toBe(before.sessions[1]);
  });

  it("leaves the theme and onboarding alone on Undo merge", () => {
    const merged = mergeData(before, file, nowMs);
    const undone = stateBeforeImport({ kind: "merge", before, after: merged }, { ...merged, themeId: "light" }, undoneAt);
    expect(undone.themeId).toBe("light");
    expect(undone.onboarded).toBe(true);
  });
});
