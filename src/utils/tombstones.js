import { isTimestamp, nowIso } from "./records.js";

// Soft deletes (schema v3). A deleted record leaves a tombstone: its id and
// when it was deleted. Tombstones live beside the data rather than as a
// `deletedAt` flag on each record, so no view ever has to filter deleted rows
// out, and a merge can still tell "deleted here" from "never existed here".

export const TOMBSTONE_KINDS = ["subjects", "topics", "milestones", "sessions"];

export const emptyTombstones = () => ({ subjects: {}, topics: {}, milestones: {}, sessions: {} });

// Topics and milestones are only unique within their subject.
export const childKey = (subjectId, childId) => `${subjectId}::${childId}`;

const isMap = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const cleanKind = (entries) =>
  Object.fromEntries(Object.entries(entries).filter(([id, deletedAt]) => id && isTimestamp(deletedAt)));

// A record kind this build doesn't know (N9): a newer build's deletes, kept
// so this build never forgets them. Only id -> timestamp maps qualify, so
// they merge by the same rule as the known kinds; empty ones are dropped so
// the known shape stays exactly emptyTombstones().
const unknownKinds = (input) =>
  Object.keys(input).filter(
    (kind) => kind !== "__proto__" && !TOMBSTONE_KINDS.includes(kind) && isMap(input[kind])
  );

// Untrusted input (storage, backup files): keep only string id -> timestamp
// pairs. Object.fromEntries defines own properties, so a "__proto__" key
// cannot reach the prototype.
export const normalizeTombstones = (input) => {
  const result = emptyTombstones();
  if (!isMap(input)) return result;
  TOMBSTONE_KINDS.forEach((kind) => {
    if (isMap(input[kind])) result[kind] = cleanKind(input[kind]);
  });
  unknownKinds(input).forEach((kind) => {
    const entries = cleanKind(input[kind]);
    if (Object.keys(entries).length) result[kind] = entries;
  });
  return result;
};

export const addTombstone = (tombstones, kind, id, now = nowIso()) => ({
  ...tombstones,
  [kind]: { ...tombstones[kind], [id]: now },
});

export const deletedAt = (tombstones, kind, id) =>
  Object.hasOwn(tombstones[kind] || {}, id) ? tombstones[kind][id] : null;

// Undo of a delete. Unchanged (same object) when there is nothing to remove.
export const removeTombstone = (tombstones, kind, id) => {
  if (!Object.hasOwn(tombstones[kind] || {}, id)) return tombstones;
  return {
    ...tombstones,
    [kind]: Object.fromEntries(Object.entries(tombstones[kind]).filter(([key]) => key !== id)),
  };
};

// Per id, the later deletion wins. Kinds this build doesn't know merge the
// same way (they are id -> timestamp maps, see normalizeTombstones), so a
// newer build's deletes survive a merge on this one.
export const mergeTombstones = (a, b) => {
  const result = emptyTombstones();
  const kinds = [...TOMBSTONE_KINDS, ...new Set([...unknownKinds(a), ...unknownKinds(b)].sort())];
  kinds.forEach((kind) => {
    const ids = [...new Set([...Object.keys(a[kind] || {}), ...Object.keys(b[kind] || {})])].sort();
    const merged = Object.fromEntries(
      ids.map((id) => {
        const left = deletedAt(a, kind, id) || "";
        const right = deletedAt(b, kind, id) || "";
        return [id, left > right ? left : right];
      })
    );
    if (TOMBSTONE_KINDS.includes(kind) || ids.length) result[kind] = merged;
  });
  return result;
};
