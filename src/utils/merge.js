import { buildInitialGame, normalizeGame, settleLegacyXP } from "./gameLogic.js";
import { childKey, deletedAt, mergeTombstones } from "./tombstones.js";

// Deterministic merge of two copies of a user's data (schema v3), using only
// what is on the records: ids, updatedAt and tombstones. The result is the
// same whichever copy is "local" (commutative) and merging a copy with itself
// changes nothing (idempotent), which is what lets sync be a transport problem.
//
// Rules:
// - Same id on both sides: the copy with the later updatedAt wins whole
//   (last write wins per record). A missing updatedAt is a pre-v3 record and
//   loses to any stamped edit. Exact ties break on content, never on side.
// - A tombstone removes a record unless the record was edited after the
//   deletion.
// - A subject's own fields, its topics and its milestones merge separately,
//   so ticking a topic on one device and renaming the subject on another
//   both survive.
// - A deleted subject stays deleted unless it, or anything in it, was edited
//   after the deletion: work done since is never thrown away by a merge.
//
// Known limits (see instruction.md): records from before v3 have no edit
// time, so where two copies differ on those the winner is arbitrary (but the
// same on every device); and the order of subjects and topics can differ
// between copies that hold the same records. With three or more copies and a
// deleted subject, the result can also depend on merge order: a pairwise
// merge that drops the subject forgets that copy's rename and its own topics,
// and a third copy can then bring the subject back without them. Two-copy
// merges are unaffected. Sync avoids this by keeping deleted rows server-side.

const stamp = (record) => record?.updatedAt || "";

const pick = (a, b) => {
  if (stamp(a) !== stamp(b)) return stamp(a) > stamp(b) ? a : b;
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
};

const survives = (record, tombstones, kind, key) => {
  const removed = deletedAt(tombstones, kind, key);
  return !removed || stamp(record) > removed;
};

// A hand-edited or corrupt file can repeat an id. Collapse repeats with the
// same rule as a merge, so the result doesn't depend on which copy had them.
const dedupe = (list) => {
  const byId = new Map();
  list.forEach((item) => byId.set(item.id, byId.has(item.id) ? pick(byId.get(item.id), item) : item));
  return byId.size === list.length ? list : [...byId.values()];
};

// The latest edit to a subject or anything inside it.
const lastActivity = (subject) =>
  [subject, ...(subject.topics || []), ...(subject.milestones || [])].reduce(
    (latest, record) => (stamp(record) > latest ? stamp(record) : latest),
    ""
  );

// Union by id. The winner's order comes first, then anything only the other
// side has, in that side's order.
const mergeById = (winnerRaw, otherRaw, combine) => {
  const winnerList = dedupe(winnerRaw);
  const otherList = dedupe(otherRaw);
  const others = new Map(otherList.map((item) => [item.id, item]));
  const seen = new Set();
  const merged = [];
  winnerList.forEach((item) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    merged.push(others.has(item.id) ? combine(item, others.get(item.id)) : item);
  });
  otherList.forEach((item) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    merged.push(item);
  });
  return merged;
};

const mergeSubject = (a, b, tombstones) => {
  const winner = pick(a, b);
  const other = winner === a ? b : a;
  const topics = mergeById(winner.topics || [], other.topics || [], pick).filter((topic) =>
    survives(topic, tombstones, "topics", childKey(winner.id, topic.id))
  );
  const milestones = mergeById(winner.milestones || [], other.milestones || [], pick).filter((milestone) =>
    survives(milestone, tombstones, "milestones", childKey(winner.id, milestone.id))
  );
  const fields = { ...winner };
  delete fields.milestones;
  return { ...fields, topics, ...(milestones.length ? { milestones } : {}) };
};

const bySessionOrder = (a, b) => {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

// Each side's legacy XP is settled against its own records first; the merged
// total is then re-derived from the merged records. Legacy XP takes the larger
// side rather than the sum, so two copies of one history never double count.
const mergeGame = (local, incoming, sessions, subjects, nowMs) => {
  const left = settleLegacyXP(normalizeGame(local.game), local.sessions, local.subjects);
  const right = settleLegacyXP(normalizeGame(incoming.game), incoming.sessions, incoming.subjects);
  const later = (x, y) => (!x ? y : !y ? x : x > y ? x : y);
  const frozenDates =
    left.frozenDates === null && right.frozenDates === null
      ? null
      : [...new Set([...(left.frozenDates || []), ...(right.frozenDates || [])])].sort();
  const merged = buildInitialGame(
    {
      currentStreak: Math.max(left.currentStreak, right.currentStreak),
      longestStreak: Math.max(left.longestStreak, right.longestStreak),
      lastStudyDate: later(left.lastStudyDate, right.lastStudyDate),
      streakProtectedUntil: Math.max(left.streakProtectedUntil || 0, right.streakProtectedUntil || 0) || null,
      legacyXP: Math.max(left.legacyXP, right.legacyXP),
      freezesUsed: Math.max(left.freezesUsed, right.freezesUsed),
      frozenDates,
    },
    sessions,
    subjects,
    nowMs
  );
  // validateStreak may add a date that is already there.
  return { ...merged, frozenDates: [...new Set(merged.frozenDates || [])].sort() };
};

// Subject order follows whichever list sorts first, so it doesn't depend on
// which copy is local.
export const mergeSubjectLists = (left, right, tombstones) => {
  const [first, second] =
    JSON.stringify(left.map((s) => s.id)) <= JSON.stringify(right.map((s) => s.id))
      ? [left, right]
      : [right, left];
  return mergeById(first, second, (a, b) => mergeSubject(a, b, tombstones))
    .map((subject) => mergeSubject(subject, subject, tombstones))
    .filter((subject) => {
      const removed = deletedAt(tombstones, "subjects", subject.id);
      return !removed || lastActivity(subject) > removed;
    });
};

export const mergeSessionLists = (left, right, tombstones) =>
  mergeById(left, right, pick)
    .filter((session) => survives(session, tombstones, "sessions", session.id))
    .sort(bySessionOrder);

// Two game states over the same records (two tabs on one device).
export const mergeGameStates = (left, right, sessions, subjects, nowMs = Date.now()) =>
  mergeGame({ game: left, sessions, subjects }, { game: right, sessions, subjects }, sessions, subjects, nowMs);

// Both inputs: { subjects, sessions, tombstones, game }, already normalized.
export const mergeData = (local, incoming, nowMs = Date.now()) => {
  const tombstones = mergeTombstones(local.tombstones, incoming.tombstones);
  const subjects = mergeSubjectLists(local.subjects, incoming.subjects, tombstones);
  const sessions = mergeSessionLists(local.sessions, incoming.sessions, tombstones);
  return {
    subjects,
    sessions,
    tombstones,
    game: mergeGame(local, incoming, sessions, subjects, nowMs),
  };
};
