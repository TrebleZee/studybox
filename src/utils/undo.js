import { addTombstone, childKey, deletedAt, removeTombstone } from "./tombstones.js";

// Undo for deletes. Before a record is deleted, describeDeletion notes where
// it was and any tombstone it already had; restoreDeletion puts it back at
// that position exactly as it was (stamps unchanged) and takes the new
// tombstone away again. XP comes back by itself because it is derived.
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

export const restoreDeletion = ({ subjects, sessions, tombstones }, entry) => {
  const key = tombstoneId(entry);
  const restoredTombstones = entry.previousTombstone
    ? addTombstone(tombstones, entry.kind, key, entry.previousTombstone)
    : removeTombstone(tombstones, entry.kind, key);
  const state = { subjects, sessions, tombstones: restoredTombstones };
  if (entry.kind === "subjects") return { ...state, subjects: insertAt(subjects, entry.index, entry.record) };
  if (entry.kind === "sessions") return { ...state, sessions: insertAt(sessions, entry.index, entry.record) };
  return {
    ...state,
    subjects: subjects.map((subject) =>
      subject.id === entry.subjectId
        ? inKeyOrder(
            { ...subject, [entry.kind]: insertAt(subject[entry.kind] || [], entry.index, entry.record) },
            entry.parentKeys
          )
        : subject
    ),
  };
};
