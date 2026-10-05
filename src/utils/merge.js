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

const stamp = (record) => record?.updatedAt || "";

const pick = (a, b) => {
  if (stamp(a) !== stamp(b)) return stamp(a) > stamp(b) ? a : b;
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
};

const survives = (record, tombstones, kind, key) => {
  const removed = deletedAt(tombstones, kind, key);
  return !removed || stamp(record) > removed;
};

// Union by id. The winner's order comes first, then anything only the other
// side has, in that side's order.
const mergeById = (winnerList, otherList, combine) => {
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
  return buildInitialGame(
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
};

// Both inputs: { subjects, sessions, tombstones, game }, already normalized.
export const mergeData = (local, incoming, nowMs = Date.now()) => {
  const tombstones = mergeTombstones(local.tombstones, incoming.tombstones);

  // Subject order follows whichever list sorts first, so it doesn't depend
  // on which copy is local.
  const [first, second] =
    JSON.stringify(local.subjects.map((s) => s.id)) <= JSON.stringify(incoming.subjects.map((s) => s.id))
      ? [local.subjects, incoming.subjects]
      : [incoming.subjects, local.subjects];
  const subjects = mergeById(first, second, (a, b) => mergeSubject(a, b, tombstones))
    .map((subject) => mergeSubject(subject, subject, tombstones))
    .filter((subject) => survives(subject, tombstones, "subjects", subject.id));

  const sessions = mergeById(local.sessions, incoming.sessions, pick)
    .filter((session) => survives(session, tombstones, "sessions", session.id))
    .sort(bySessionOrder);

  return {
    subjects,
    sessions,
    tombstones,
    game: mergeGame(local, incoming, sessions, subjects, nowMs),
  };
};
