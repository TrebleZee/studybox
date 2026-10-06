import { settleLegacyXP } from "./gameLogic.js";
import { mergeData } from "./merge.js";
import { nowIso, touch } from "./records.js";
import { replaceData, stampPast } from "./replace.js";
import { addTombstone, childKey, deletedAt, removeTombstone, subtaskKey, TOMBSTONE_KINDS } from "./tombstones.js";

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
// that already took the merge. Unchanged records keep their stamps, and so
// does a record that is simply gone with no tombstone (an untouched
// placeholder default a restore replaced): no tab can hold a newer copy of
// it, and the copy another tab still holds is this one.
const restampChanged = (list, mergedList, tombstoneOf, now) => {
  const merged = byId(mergedList);
  return list.map((record) => {
    const mergedRecord = merged.get(record.id);
    if (mergedRecord && same(record, mergedRecord)) return record;
    if (!mergedRecord && !tombstoneOf(record.id)) return record;
    return touch(record, stampPast([mergedRecord?.updatedAt, tombstoneOf(record.id)], now));
  });
};

// Subtasks merge one by one (N19), so re-stamping a topic doesn't win its
// subtasks back: each one the merge changed or removed is re-stamped too.
const restampSubtasks = (subjectId, topics, mergedTopics, tombstones, now) => {
  const merged = byId(mergedTopics);
  return topics.map((topic) => {
    const tombstoneOf = (id) => deletedAt(tombstones, "subtasks", subtaskKey(subjectId, topic.id, id));
    const subtasks = restampChanged(topic.subtasks || [], merged.get(topic.id)?.subtasks, tombstoneOf, now);
    return subtasks.every((subtask, index) => subtask === topic.subtasks[index]) ? topic : { ...topic, subtasks };
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
    const topics = restampSubtasks(subject.id, restampChanged(subject.topics, merged?.topics, child("topics"), now), merged?.topics, tombstones, now);
    const milestones = subject.milestones && restampChanged(subject.milestones, merged?.milestones, child("milestones"), now);
    const removed = deletedAt(tombstones, "subjects", subject.id);
    const fieldsChanged = merged ? !same(ownFields(subject), ownFields(merged)) : !!removed;
    const restored = { ...subject, topics, ...(milestones ? { milestones } : {}) };
    return fieldsChanged
      ? touch(restored, stampPast([merged?.updatedAt, removed], now))
      : restored;
  });
  const sessions = restampChanged(before.sessions, after.sessions, (id) => deletedAt(tombstones, "sessions", id), now);
  return { ...before, subjects, sessions };
};

// Undo restore (N11). Another open tab merges the restore into what it had
// and writes it here: an echo like that holds nothing that wasn't here before
// the restore or in the file, and leaves the offer in place. Anything else (a
// logged session, a tick, a delete, here or in another tab) withdraws it.
// Records are compared by content, not by a last-write-wins merge (R1): a file
// stamped ahead of this device's clock would otherwise win against every edit
// made since, and Undo restore would silently discard them. Every session,
// subject's own fields, topic's own fields, subtask, milestone and tombstone
// here must be exactly a copy from before the restore or from the file. The game has no stamps and
// tabs merge it by taking the larger values, so it alone is compared by
// merging; XP is derived, so totalXP is left out.
const withoutTotal = (game) => ({ ...game, totalXP: null });
const sameData = (a, b) =>
  MERGED_KEYS.every((key) =>
    key === "game" ? canonical(withoutTotal(a.game)) === canonical(withoutTotal(b.game)) : canonical(a[key]) === canonical(b[key])
  );
// Order isn't synced yet, so an echo may hold the same records in another order.
const sortById = (list) => [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const byIdOrder = (data) => ({
  ...data,
  subjects: sortById(data.subjects).map((subject) => ({
    ...subject,
    topics: sortById(subject.topics || []),
    ...(subject.milestones ? { milestones: sortById(subject.milestones) } : {}),
  })),
});

// Canonical copies of each record in `lists`, keyed by id (a Map: ids are untrusted).
const copiesOf = (lists) => {
  const copies = new Map();
  lists.flat().forEach((record) => {
    if (!copies.has(record.id)) copies.set(record.id, new Set());
    copies.get(record.id).add(canonical(record));
  });
  return copies;
};
const allKnown = (list = [], copies) => list.every((record) => copies.get(record.id)?.has(canonical(record)));
const subjectIn = (data, id) => data.subjects.find((subject) => subject.id === id);
// A merge combines a topic's own fields from one copy with subtasks from
// both (N19), so a topic is known when its fields are, and each subtask is.
const topicFields = (topic) => {
  const fields = { ...topic };
  delete fields.subtasks;
  return fields;
};
const topicsKnown = (topics = [], knownLists) =>
  allKnown(topics.map(topicFields), copiesOf(knownLists.map((list) => list.map(topicFields)))) &&
  topics.every((topic) =>
    allKnown(topic.subtasks, copiesOf(knownLists.map((list) => list.find((known) => known.id === topic.id)?.subtasks || [])))
  );

const recordsKnown = (state, sources) => {
  if (!allKnown(state.sessions, copiesOf(sources.map((source) => source.sessions)))) return false;
  const subjectFields = copiesOf(sources.map((source) => source.subjects.map(ownFields)));
  const subjectsKnown = state.subjects.every((subject) => {
    if (!subjectFields.get(subject.id)?.has(canonical(ownFields(subject)))) return false;
    const known = sources.map((source) => subjectIn(source, subject.id)).filter(Boolean);
    return (
      topicsKnown(subject.topics, known.map((copy) => copy.topics || [])) &&
      allKnown(subject.milestones, copiesOf(known.map((copy) => copy.milestones || [])))
    );
  });
  if (!subjectsKnown) return false;
  return [...TOMBSTONE_KINDS, "subtasks"].every((kind) =>
    Object.entries(state.tombstones?.[kind] || {}).every(([id, time]) =>
      sources.some((source) => deletedAt(source.tombstones, kind, id) === time)
    )
  );
};

export const unchangedSinceRestore = (undo, state, nowMs = Date.now()) => {
  if (!undo?.after || state.themeId !== undo.after.themeId) return false;
  if (sameData(byIdOrder(undo.after), byIdOrder(state))) return true;
  if (!recordsKnown(state, [undo.after, undo.before])) return false;
  const known = mergeData(undo.after, undo.before, nowMs);
  return canonical(withoutTotal(mergeData(known, state, nowMs).game)) === canonical(withoutTotal(known.game));
};

// What Restore from file leaves: the file's lists, game and theme, keeping
// what's here for any part the file doesn't carry. The lists replace what's
// here through replaceData (N10): what they remove is tombstoned, the
// tombstones here are kept beside the file's, and a record another copy could
// beat is stamped as edited now. `placeholder`: the subjects here are the
// untouched onboarding defaults, which leave no tombstones.
export const stateAfterRestore = (restored, state, { placeholder = false, now = nowIso() } = {}) => {
  const lists = replaceData(state, restored, { placeholder, now });
  const after = { ...lists, themeId: restored.themeId || state.themeId };
  return { ...after, game: restored.game ? settleLegacyXP(restored.game, after.sessions, after.subjects) : state.game };
};

// The offer beside an import's message: { kind: "merge" | "restore", before, after }.
export const canUndoImport = (offer, state) =>
  offer?.kind === "restore" ? unchangedSinceRestore(offer, state) : unchangedSinceMerge(offer?.after, state);

// The state Undo puts back, theme and onboarding included. Undo restore
// re-stamps against what is here now, which may already include another
// tab's echo; records only the file had are left out but not tombstoned, as
// for Undo merge (maintainer decision, 2026-10-05): with another tab open they
// come back from it. A merge changes neither theme nor onboarding, so Undo
// merge leaves the theme as it is now and onboarding done.
export const stateBeforeImport = (offer, state, now = nowIso()) =>
  offer.kind === "restore"
    ? restoreBeforeMerge({ before: offer.before, after: state }, now)
    : { ...restoreBeforeMerge(offer, now), themeId: state.themeId, onboarded: true };
