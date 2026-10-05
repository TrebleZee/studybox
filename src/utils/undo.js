import { nowIso, touch } from "./records.js";
import { addTombstone, childKey, deletedAt, removeTombstone } from "./tombstones.js";

// Undo for deletes. Before a record is deleted, describeDeletion notes where
// it was and any tombstone it already had; restoreDeletion puts it back at
// that position as it was, stamped as edited now so it wins against the
// delete in every tab, and takes the new tombstone away again. XP comes back
// by itself because it is derived.
//
// kind: "subjects" | "sessions" | "topics" | "milestones" (the last two
// within `subjectId`). State: { subjects, sessions, tombstones }.

const tombstoneId = ({ kind, id, subjectId }) =>
  kind === "topics" || kind === "milestones" ? childKey(subjectId, id) : id;

const listOf = ({ subjects, sessions }, kind, subjectId) => {
  if (kind === "subjects") return subjects;
  if (kind === "sessions") return sessions;
  return subjects.find((subject) => subject.id === subjectId)?.[kind] || [];
};

export const describeDeletion = (state, kind, id, subjectId = null) => {
  const list = listOf(state, kind, subjectId);
  const index = list.findIndex((record) => record.id === id);
  if (index < 0) return null;
  const record = list[index];
  const entry = { kind, id, subjectId, index, record, name: kind === "sessions" ? record.subjectName : record.name };
  // A subject drops its milestones key with its last milestone; remembering
  // the key order puts it back where it was.
  const parent = subjectId ? state.subjects.find((subject) => subject.id === subjectId) : null;
  return {
    ...entry,
    ...(parent ? { parentKeys: Object.keys(parent) } : {}),
    previousTombstone: deletedAt(state.tombstones, kind, tombstoneId(entry)),
  };
};

const insertAt = (list, index, record) =>
  list.some((item) => item.id === record.id) ? list : [...list.slice(0, index), record, ...list.slice(index)];

const inKeyOrder = (object, keys = []) => {
  const first = keys.filter((key) => Object.hasOwn(object, key));
  const rest = Object.keys(object).filter((key) => !first.includes(key));
  return Object.fromEntries([...first, ...rest].map((key) => [key, object[key]]));
};

// The restored record is stamped as edited now (N8): another tab may already
// have merged the delete's tombstone, and only a record edited after its
// tombstone survives a merge. If Undo lands in the same millisecond as the
// delete, the stamp goes one millisecond past the tombstone.
const restoreStamp = (tombstone, now) => {
  if (!tombstone || now > tombstone) return now;
  return new Date(Date.parse(tombstone) + 1).toISOString();
};

export const restoreDeletion = ({ subjects, sessions, tombstones }, entry, now = nowIso()) => {
  const key = tombstoneId(entry);
  const record = touch(entry.record, restoreStamp(deletedAt(tombstones, entry.kind, key), now));
  const restoredTombstones = entry.previousTombstone
    ? addTombstone(tombstones, entry.kind, key, entry.previousTombstone)
    : removeTombstone(tombstones, entry.kind, key);
  const state = { subjects, sessions, tombstones: restoredTombstones };
  if (entry.kind === "subjects") return { ...state, subjects: insertAt(subjects, entry.index, record) };
  if (entry.kind === "sessions") return { ...state, sessions: insertAt(sessions, entry.index, record) };
  return {
    ...state,
    subjects: subjects.map((subject) =>
      subject.id === entry.subjectId
        ? inKeyOrder(
            { ...subject, [entry.kind]: insertAt(subject[entry.kind] || [], entry.index, record) },
            entry.parentKeys
          )
        : subject
    ),
  };
};

// Undo merge is only safe while nothing has changed since the merge: the
// state must still be the very objects the merge produced (`after`).
const MERGED_KEYS = ["subjects", "sessions", "tombstones", "game"];
export const unchangedSinceMerge = (after, state) => !!after && MERGED_KEYS.every((key) => after[key] === state[key]);
