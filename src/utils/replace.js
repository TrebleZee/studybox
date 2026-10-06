import { nowIso, touch } from "./records.js";
import { addTombstone, childKey, deletedAt, emptyTombstones, mergeTombstones, subtaskKey } from "./tombstones.js";

// Replacing data (N10): Restore from file, Start blank, Use template and
// Choose my subjects put whole new lists in place of what is here. A merge
// (another tab now, sync later) must end with only the new lists, so:
//
// - every record they remove is tombstoned (a subject, a topic or milestone
//   of a subject they keep, a subtask of a topic they keep, a session), unless it is one of the untouched
//   placeholder defaults (`placeholder`), which were never the user's data and
//   must leave nothing a fresh device would push;
// - the tombstones here are kept, merged with any the new data carries, so
//   replacing with a file from before tombstones (pre-v3) forgets no delete;
// - a record they put in place that another copy could beat (this device's
//   own copy, if it is as new or newer, or a tombstone at or after its stamp)
//   is stamped as edited now, past both, so it wins in every tab. A topic is
//   judged on its own fields and each subtask on its own, as they merge
//   (N19). Anything else keeps its stamps exactly.
//
// current: { subjects, sessions, tombstones }; next: any of { subjects,
// sessions, tombstones }. A list next doesn't carry is left as it is.

const stamp = (record) => record?.updatedAt || "";

// Key order doesn't matter when asking "is this the same record?".
const canonical = (value) =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v
  );

// A stamp later than `now` and than every given time.
export const stampPast = (times, now) => {
  const latest = times.filter(Boolean).reduce((max, time) => (time > max ? time : max), "");
  return now > latest ? now : new Date(Date.parse(latest) + 1).toISOString();
};

const ownFields = (subject) => {
  const fields = { ...subject };
  delete fields.topics;
  delete fields.milestones;
  return fields;
};

const byId = (list = []) => new Map(list.map((record) => [record.id, record]));
const missingFrom = (list = [], kept) => list.filter((record) => !kept.has(record.id)).map((record) => record.id);

// The record as put in place: restamped only if `existing` or a tombstone
// would otherwise beat it in a merge. `fields` picks what is compared.
const settle = (record, existing, removed, now, fields = (r) => r) => {
  const beaten = existing && canonical(fields(existing)) !== canonical(fields(record)) && stamp(existing) >= stamp(record);
  const buried = removed && !(stamp(record) > removed);
  return beaten || buried ? touch(record, stampPast([stamp(existing), removed, stamp(record)], now)) : record;
};

const topicFields = (topic) => {
  const fields = { ...topic };
  delete fields.subtasks;
  return fields;
};

// The latest edit to a subject or anything inside it, as the merge reckons it.
const lastActivity = (subject) =>
  [subject, ...(subject.milestones || []), ...(subject.topics || []).flatMap((topic) => [topic, ...(topic.subtasks || [])])].reduce(
    (latest, record) => (stamp(record) > latest ? stamp(record) : latest),
    ""
  );

const CHILD_KINDS = ["topics", "milestones"];

// A topic put in place: each subtask settles on its own, then the topic on its own fields.
const settleTopic = (topic, mine, subjectId, tombstones, now) => {
  const theirs = byId(mine?.subtasks);
  const subtasks = Array.isArray(topic.subtasks)
    ? topic.subtasks.map((subtask) =>
        settle(subtask, theirs.get(subtask.id), deletedAt(tombstones, "subtasks", subtaskKey(subjectId, topic.id, subtask.id)), now)
      )
    : topic.subtasks;
  const settled = subtasks === topic.subtasks || subtasks.every((x, i) => x === topic.subtasks[i]) ? topic : { ...topic, subtasks };
  return settle(settled, mine, deletedAt(tombstones, "topics", childKey(subjectId, topic.id)), now, topicFields);
};

const replaceSubjects = (current, next, tombstones, placeholder, now) => {
  const here = placeholder ? new Map() : byId(current);
  const kept = byId(next);
  let result = tombstones;
  missingFrom(placeholder ? [] : current, kept).forEach((id) => (result = addTombstone(result, "subjects", id, now)));
  next.forEach((subject) => {
    const mine = here.get(subject.id);
    CHILD_KINDS.forEach((kind) =>
      missingFrom(mine?.[kind], byId(subject[kind])).forEach(
        (id) => (result = addTombstone(result, kind, childKey(subject.id, id), now))
      )
    );
    const myTopics = byId(mine?.topics);
    (subject.topics || []).forEach((topic) =>
      missingFrom(myTopics.get(topic.id)?.subtasks, byId(topic.subtasks)).forEach(
        (id) => (result = addTombstone(result, "subtasks", subtaskKey(subject.id, topic.id, id), now))
      )
    );
  });
  const subjects = next.map((subject) => {
    const mine = here.get(subject.id);
    const children = Object.fromEntries(
      CHILD_KINDS.filter((kind) => Array.isArray(subject[kind])).map((kind) => {
        const theirs = byId(mine?.[kind]);
        const list = subject[kind].map((child) =>
          kind === "topics"
            ? settleTopic(child, theirs.get(child.id), subject.id, result, now)
            : settle(child, theirs.get(child.id), deletedAt(result, kind, childKey(subject.id, child.id)), now)
        );
        return [kind, list];
      })
    );
    const withChildren = { ...subject, ...children };
    const own = settle(withChildren, mine, null, now, ownFields);
    // A deleted subject stays deleted unless something in it is newer than the delete.
    const removed = deletedAt(result, "subjects", subject.id);
    return removed && !(lastActivity(own) > removed) ? touch(own, stampPast([removed, stamp(own)], now)) : own;
  });
  return { subjects, tombstones: result };
};

export const replaceData = (current, next, { placeholder = false, now = nowIso() } = {}) => {
  let tombstones = mergeTombstones(current.tombstones ?? emptyTombstones(), next.tombstones ?? emptyTombstones());
  let { subjects, sessions } = current;
  if (next.subjects) ({ subjects, tombstones } = replaceSubjects(current.subjects, next.subjects, tombstones, placeholder, now));
  if (next.sessions) {
    const here = byId(current.sessions);
    missingFrom(current.sessions, byId(next.sessions)).forEach(
      (id) => (tombstones = addTombstone(tombstones, "sessions", id, now))
    );
    sessions = next.sessions.map((session) =>
      settle(session, here.get(session.id), deletedAt(tombstones, "sessions", session.id), now)
    );
  }
  return { subjects, sessions, tombstones };
};
