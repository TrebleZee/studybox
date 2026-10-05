import { isTimestamp, nowIso } from "./records.js";

// Soft deletes (schema v3). A deleted record leaves a tombstone: its id and
// when it was deleted. Tombstones live beside the data rather than as a
// `deletedAt` flag on each record, so no view ever has to filter deleted rows
// out, and a merge can still tell "deleted here" from "never existed here".

export const TOMBSTONE_KINDS = ["subjects", "topics", "milestones", "sessions"];

export const emptyTombstones = () => ({ subjects: {}, topics: {}, milestones: {}, sessions: {} });

// Topics and milestones are only unique within their subject.
export const childKey = (subjectId, childId) => `${subjectId}::${childId}`;

// Untrusted input (storage, backup files): keep only string id -> timestamp
// pairs. Object.fromEntries defines own properties, so a "__proto__" key
// cannot reach the prototype.
export const normalizeTombstones = (input) => {
  const result = emptyTombstones();
  if (!input || typeof input !== "object" || Array.isArray(input)) return result;
  TOMBSTONE_KINDS.forEach((kind) => {
    const entries = input[kind];
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) return;
    result[kind] = Object.fromEntries(
      Object.entries(entries).filter(([id, deletedAt]) => id && isTimestamp(deletedAt))
    );
  });
  return result;
};

export const addTombstone = (tombstones, kind, id, now = nowIso()) => ({
  ...tombstones,
  [kind]: { ...tombstones[kind], [id]: now },
});

export const deletedAt = (tombstones, kind, id) =>
  Object.hasOwn(tombstones[kind] || {}, id) ? tombstones[kind][id] : null;

// Per id, the later deletion wins.
export const mergeTombstones = (a, b) => {
  const result = emptyTombstones();
  TOMBSTONE_KINDS.forEach((kind) => {
    const ids = [...new Set([...Object.keys(a[kind] || {}), ...Object.keys(b[kind] || {})])].sort();
    result[kind] = Object.fromEntries(
      ids.map((id) => {
        const left = deletedAt(a, kind, id) || "";
        const right = deletedAt(b, kind, id) || "";
        return [id, left > right ? left : right];
      })
    );
  });
  return result;
};
