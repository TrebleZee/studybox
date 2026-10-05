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

// Key order doesn't matter when asking "is this the same record?".
const canonical = (value) =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v
  );

// Undo merge is only safe while nothing has changed since the merge: the
// state must still hold exactly what the merge produced (`after`). It is
// compared by content, not identity (C14): another tab's write that only
// echoes records this tab already has is merged in as a new but identical
// object, and must not withdraw the offer.
const MERGED_KEYS = ["subjects", "sessions", "tombstones", "game"];
export const unchangedSinceMerge = (after, state) =>
  !!after && MERGED_KEYS.every((key) => after[key] === state[key] || canonical(after[key]) === canonical(state[key]));

// A stamp later than `now` and than every given time, so the record it marks
// wins a merge against any of them.
const stampPast = (times, now) => {
  const latest = times.filter(Boolean).reduce((max, time) => (time > max ? time : max), "");
  return now > latest ? now : new Date(Date.parse(latest) + 1).toISOString();
};

const byId = (list = []) => new Map(list.map((record) => [record.id, record]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ownFields = (subject) => {
  const fields = { ...subject };
  delete fields.topics;
  delete fields.milestones;
  return fields;
};

// Re-stamps each record of `list` that the merge changed or removed, past the
// merged copy and any tombstone for it, so the pre-merge copy wins in a tab
// that already took the merge. Unchanged records keep their stamps.
const restampChanged = (list, mergedList, tombstoneOf, now) => {
  const merged = byId(mergedList);
  return list.map((record) => {
    const mergedRecord = merged.get(record.id);
    if (mergedRecord && same(record, mergedRecord)) return record;
    return touch(record, stampPast([mergedRecord?.updatedAt, tombstoneOf(record.id)], now));
  });
};

// The state to put back on Undo merge (N8). Records only the file had are
// left out but not tombstoned (maintainer decision, 2026-10-05): with another
// tab open they come back from it, and a later merge of that file, or sync
// with the device it came from, never deletes them there.
export const restoreBeforeMerge = ({ before, after }, now = nowIso()) => {
  const { tombstones } = after;
  const mergedSubjects = byId(after.subjects);
  const subjects = before.subjects.map((subject) => {
    const merged = mergedSubjects.get(subject.id);
    const child = (kind) => (id) => deletedAt(tombstones, kind, childKey(subject.id, id));
    const topics = restampChanged(subject.topics, merged?.topics, child("topics"), now);
    const milestones = subject.milestones && restampChanged(subject.milestones, merged?.milestones, child("milestones"), now);
    const fieldsChanged = !merged || !same(ownFields(subject), ownFields(merged));
    const restored = { ...subject, topics, ...(milestones ? { milestones } : {}) };
    return fieldsChanged
      ? touch(restored, stampPast([merged?.updatedAt, deletedAt(tombstones, "subjects", subject.id)], now))
      : restored;
  });
  const sessions = restampChanged(before.sessions, after.sessions, (id) => deletedAt(tombstones, "sessions", id), now);
  return { ...before, subjects, sessions };
};
