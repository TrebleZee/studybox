import { describe, expect, it } from "vitest";
import { DEFAULT_GAME } from "./gameLogic.js";
import { mergeData } from "./merge.js";
import { addTombstone, childKey, emptyTombstones, removeTombstone } from "./tombstones.js";
import { describeDeletion, restoreDeletion, unchangedSinceMerge } from "./undo.js";

describe("unchangedSinceMerge", () => {
  const after = { subjects: [], sessions: [], tombstones: emptyTombstones(), game: { totalXP: 0 } };
  it("is true only while every merged record list is the same object", () => {
    expect(unchangedSinceMerge(after, { ...after })).toBe(true);
    expect(unchangedSinceMerge(after, { ...after, sessions: [] })).toBe(false);
    expect(unchangedSinceMerge(after, { ...after, game: { totalXP: 0 } })).toBe(false);
    expect(unchangedSinceMerge(undefined, after)).toBe(false);
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
