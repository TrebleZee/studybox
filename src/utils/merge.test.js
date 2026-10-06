import { describe, expect, it } from "vitest";
import { buildBackup, parseBackup } from "./backup.js";
import { DEFAULT_GAME, buildInitialGame } from "./gameLogic.js";
import { mergeData } from "./merge.js";
import { normalizeSessions, normalizeSubjects } from "./subjects.js";
import { addTombstone, childKey, emptyTombstones } from "./tombstones.js";

const at = (day, hour = 9) => `2026-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`;
const NOW = Date.parse(at(20));

const topic = (id, extra = {}) => ({ id, name: id, done: false, subtasks: [], ...extra });
const subject = (id, topics, extra = {}) => ({ id, name: id, color: "#111111", topics, ...extra });
const session = (id, day, extra = {}) => ({
  id,
  subjectId: "physics",
  subjectName: "Physics",
  subjectColor: "#111111",
  duration: 1800,
  date: at(day),
  note: "",
  tags: [],
  createdAt: at(day),
  updatedAt: at(day),
  ...extra,
});

const copy = ({ subjects = [], sessions = [], tombstones = emptyTombstones(), game = DEFAULT_GAME } = {}) => ({
  subjects: normalizeSubjects(subjects),
  sessions: normalizeSessions(sessions),
  tombstones,
  game,
});

const merge = (a, b) => mergeData(a, b, NOW);
const ids = (list) => list.map((item) => item.id);

describe("mergeData", () => {
  it("keeps sessions logged on either device, newest first", () => {
    const a = copy({ sessions: [session("sess-a", 3)] });
    const b = copy({ sessions: [session("sess-b", 4)] });
    expect(ids(merge(a, b).sessions)).toEqual(["sess-b", "sess-a"]);
  });

  it("takes the later edit when both devices changed the same session", () => {
    const a = copy({ sessions: [session("s", 3, { note: "old", updatedAt: at(3) })] });
    const b = copy({ sessions: [session("s", 3, { note: "new", updatedAt: at(5) })] });
    expect(merge(a, b).sessions[0].note).toBe("new");
    expect(merge(b, a).sessions[0].note).toBe("new");
  });

  it("lets a stamped edit beat a pre-v3 record with no stamp", () => {
    const legacy = { ...session("s", 3, { note: "legacy" }) };
    delete legacy.updatedAt;
    delete legacy.createdAt;
    const a = copy({ sessions: [legacy] });
    const b = copy({ sessions: [session("s", 3, { note: "edited", updatedAt: at(4) })] });
    expect(merge(a, b).sessions[0].note).toBe("edited");
  });

  it("removes a session deleted on the other device", () => {
    const a = copy({ sessions: [session("s", 3)] });
    const b = copy({ tombstones: addTombstone(emptyTombstones(), "sessions", "s", at(4)) });
    expect(merge(a, b).sessions).toEqual([]);
    expect(merge(b, a).sessions).toEqual([]);
  });

  it("keeps a session that was edited after the other device deleted it", () => {
    const a = copy({ sessions: [session("s", 3, { note: "kept", updatedAt: at(6) })] });
    const b = copy({ tombstones: addTombstone(emptyTombstones(), "sessions", "s", at(4)) });
    expect(merge(a, b).sessions[0].note).toBe("kept");
  });

  it("does not resurrect a deleted record that the other device never touched", () => {
    const stale = session("s", 3);
    const a = copy({ tombstones: addTombstone(emptyTombstones(), "sessions", "s", at(8)) });
    const once = merge(a, copy({ sessions: [stale] }));
    expect(merge(once, copy({ sessions: [stale] })).sessions).toEqual([]);
  });

  it("merges topics one by one, so a tick here and a tick there both survive", () => {
    const base = [topic("t1"), topic("t2")];
    const a = copy({ subjects: [subject("physics", [{ ...base[0], done: true, updatedAt: at(3) }, base[1]])] });
    const b = copy({ subjects: [subject("physics", [base[0], { ...base[1], done: true, updatedAt: at(4) }])] });
    expect(merge(a, b).subjects[0].topics.map((t) => t.done)).toEqual([true, true]);
  });

  it("keeps a subject rename from one device and a topic tick from the other", () => {
    const a = copy({ subjects: [subject("physics", [topic("t1")], { name: "Physics A", updatedAt: at(5) })] });
    const b = copy({ subjects: [subject("physics", [topic("t1", { done: true, updatedAt: at(3) })])] });
    const merged = merge(a, b).subjects[0];
    expect(merged.name).toBe("Physics A");
    expect(merged.topics[0].done).toBe(true);
  });

  it("keeps topics and milestones added on either device", () => {
    const a = copy({
      subjects: [subject("physics", [topic("t1"), topic("topic-a", { updatedAt: at(3) })])],
    });
    const b = copy({
      subjects: [
        subject("physics", [topic("t1")], {
          milestones: [{ id: "ms-b", name: "NEA", kind: "nea", due: null, done: false, updatedAt: at(4) }],
        }),
      ],
    });
    const merged = merge(a, b).subjects[0];
    expect(ids(merged.topics).sort()).toEqual(["t1", "topic-a"]);
    expect(ids(merged.milestones)).toEqual(["ms-b"]);
  });

  it("removes a topic, a milestone and a whole subject deleted on the other device", () => {
    const a = copy({
      subjects: [
        subject("physics", [topic("t1"), topic("t2")], {
          milestones: [{ id: "m1", name: "NEA", kind: "nea", due: null, done: false }],
        }),
        subject("maths", [topic("m0")]),
      ],
    });
    let tombstones = addTombstone(emptyTombstones(), "topics", childKey("physics", "t2"), at(4));
    tombstones = addTombstone(tombstones, "milestones", childKey("physics", "m1"), at(4));
    tombstones = addTombstone(tombstones, "subjects", "maths", at(4));
    const b = copy({ subjects: [subject("physics", [topic("t1")])], tombstones });

    const merged = merge(a, b);
    expect(ids(merged.subjects)).toEqual(["physics"]);
    expect(ids(merged.subjects[0].topics)).toEqual(["t1"]);
    expect(merged.subjects[0]).not.toHaveProperty("milestones");
  });

  it("keeps a deleted subject whose topics were worked on after the deletion", () => {
    const tombstones = addTombstone(emptyTombstones(), "subjects", "physics", at(5));
    const phone = copy({ tombstones });
    const laptop = copy({
      subjects: [subject("physics", [topic("t1", { done: true, updatedAt: at(10) }), topic("t2")])],
    });
    [merge(laptop, phone), merge(phone, laptop)].forEach((merged) => {
      expect(ids(merged.subjects)).toEqual(["physics"]);
      expect(merged.subjects[0].topics[0].done).toBe(true);
    });
  });

  it("still deletes a subject when the only edits in it came before the deletion", () => {
    const tombstones = addTombstone(emptyTombstones(), "subjects", "physics", at(12));
    const laptop = copy({ subjects: [subject("physics", [topic("t1", { done: true, updatedAt: at(10) })])] });
    expect(merge(laptop, copy({ tombstones })).subjects).toEqual([]);
  });

  it("gives the same records whatever order three copies are merged in", () => {
    // Fields this build doesn't know (N9) ride along and don't affect the order independence.
    const a = copy({ subjects: [subject("c", [topic("t1", { notes: "from a" }), topic("t2", { done: true, updatedAt: at(9) })])] });
    const b = copy({ tombstones: addTombstone(emptyTombstones(), "subjects", "c", at(4)) });
    const c = copy({
      subjects: [subject("c", [topic("t1"), topic("t2", { updatedAt: at(3) })], { name: "C2", updatedAt: at(5), order: 1 })],
      sessions: [session("s", 6, { topicId: "t1" })],
    });
    // Stamp ties around an unknown field: t1 is unstamped on a (with notes) and
    // c (without); session s is stamped at(6) on both, with topicId only on c.
    a.sessions = normalizeSessions([session("s", 6)]);
    const flat = (data) => ({
      sessions: data.sessions,
      tombstones: data.tombstones,
      subjects: data.subjects.map((s) => ({ ...s, topics: [...s.topics].sort((x, y) => (x.id < y.id ? -1 : 1)) })),
    });
    const leftFirst = merge(merge(a, b), c);
    expect(flat(merge(a, merge(b, c)))).toEqual(flat(leftFirst));
    expect(flat(merge(merge(c, a), b))).toEqual(flat(leftFirst));
    expect(leftFirst.subjects[0].topics.find((t) => t.id === "t2").done).toBe(true);
    expect(leftFirst.subjects[0].order).toBe(1);
    expect(leftFirst.subjects[0].topics.find((t) => t.id === "t1").notes).toBe("from a");
    expect(leftFirst.sessions[0].topicId).toBe("t1");
  });

  // Review finding R4 on #50: three stamp-tied copies of one subject, one of
  // them with milestones. The winner is picked on the subject's own fields,
  // so the `milestones` key a merged copy gains cannot tip a later tie.
  it("gives the same subject fields whatever order three stamp-tied copies with milestones meet in", () => {
    const milestone = { id: "m1", name: "NEA", kind: "nea", due: null, done: false };
    const a = copy({ subjects: [subject("s", [topic("t")], { milestones: [milestone] })] });
    const b = copy({ subjects: [subject("s", [topic("t")], { examYear: 2027, notes: "y" })] });
    const c = copy({ subjects: [subject("s", [topic("t")], { order: 0, notes: "x" })] });
    const own = (data) => {
      const { topics, milestones, ...fields } = data.subjects[0];
      return { fields, topicIds: ids(topics), milestoneIds: ids(milestones || []) };
    };
    const leftFirst = own(merge(merge(a, b), c));
    expect(own(merge(a, merge(b, c)))).toEqual(leftFirst);
    expect(own(merge(merge(c, a), b))).toEqual(leftFirst);
    expect(own(merge(merge(b, c), a))).toEqual(leftFirst);
    expect(leftFirst.milestoneIds).toEqual(["m1"]);
  });

  // Known limit, pinned so a change to it is deliberate (see instruction.md).
  it("can forget one copy's rename when three copies meet around a deleted subject", () => {
    const a = copy({
      subjects: [subject("phys", [topic("t1"), topic("mine", { done: true, updatedAt: at(3) })], { name: "Renamed", updatedAt: at(4) })],
    });
    const b = copy({ tombstones: addTombstone(emptyTombstones(), "subjects", "phys", at(6)) });
    const c = copy({ subjects: [subject("phys", [topic("t1", { done: true, updatedAt: at(7) })])] });

    const dropFirst = merge(merge(a, b), c).subjects[0];
    const reviveFirst = merge(a, merge(b, c)).subjects[0];
    expect(dropFirst.name).toBe("phys");
    expect(ids(dropFirst.topics)).toEqual(["t1"]);
    expect(reviveFirst.name).toBe("Renamed");
    expect(ids(reviveFirst.topics).sort()).toEqual(["mine", "t1"]);
    // Either way the work done after the deletion survives.
    [dropFirst, reviveFirst].forEach((result) => expect(result.topics.find((t) => t.id === "t1").done).toBe(true));
  });

  it("collapses a repeated id the same way whichever copy has it", () => {
    const a = copy({
      sessions: [session("x", 5, { note: "v1", updatedAt: at(5) }), session("x", 5, { note: "v2", updatedAt: at(1) })],
    });
    const b = copy({ sessions: [session("x", 5, { note: "v3", updatedAt: at(3) })] });
    expect(merge(a, b).sessions.map((s) => s.note)).toEqual(["v1"]);
    expect(merge(b, a).sessions.map((s) => s.note)).toEqual(["v1"]);
  });

  it("does not confuse the same topic id in two subjects", () => {
    const a = copy({ subjects: [subject("physics", [topic("t0")]), subject("maths", [topic("t0")])] });
    const b = copy({ tombstones: addTombstone(emptyTombstones(), "topics", childKey("physics", "t0"), at(4)) });
    const merged = merge(a, b);
    expect(merged.subjects.find((s) => s.id === "physics").topics).toEqual([]);
    expect(merged.subjects.find((s) => s.id === "maths").topics).toHaveLength(1);
  });

  it("rebuilds the streak from the merged sessions", () => {
    const a = copy({ sessions: [session("a1", 17), session("a2", 19)] });
    const b = copy({ sessions: [session("b1", 18)] });
    const merged = merge(a, b);
    expect(merged.game.currentStreak).toBe(3);
    expect(merged.game.longestStreak).toBe(3);
  });

  it("is idempotent: merging a copy with itself changes nothing", () => {
    const a = copy({
      subjects: [subject("physics", [topic("t1", { updatedAt: at(3), notes: "unknown here" })], { updatedAt: at(2), order: 3 })],
      sessions: [session("s1", 18, { topicId: "t1" }), session("s2", 19)],
      tombstones: addTombstone(emptyTombstones(), "sessions", "gone", at(4)),
    });
    const once = merge(a, a);
    expect(once.subjects).toEqual(a.subjects);
    expect(once.sessions).toEqual([...a.sessions].reverse());
    expect(merge(once, once)).toEqual(once);
    expect(once.subjects[0]).toMatchObject({ order: 3 });
    expect(once.subjects[0].topics[0].notes).toBe("unknown here");
  });

  // N9: a newer build's fields are opaque to the merge. They travel with the
  // record that wins (last write wins whole, with or without the field) and
  // stay on records only one side has.
  it("keeps fields it does not know on the winning record and on records only one side has", () => {
    const a = copy({
      subjects: [
        subject("physics", [topic("t1", { notes: "a", updatedAt: at(3) }), topic("only-a", { order: 4 })], { order: 1, updatedAt: at(2) }),
      ],
      sessions: [session("s1", 18, { topicId: "t1" })],
    });
    const older = copy({
      subjects: [subject("physics", [topic("t1", { updatedAt: at(1) })], { name: "Old", updatedAt: at(1) })],
      sessions: [session("s1", 18, { updatedAt: at(1) })],
    });
    const withOlder = merge(a, older);
    expect(withOlder.subjects[0]).toMatchObject({ name: "physics", order: 1 });
    expect(withOlder.subjects[0].topics.find((t) => t.id === "t1").notes).toBe("a");
    expect(withOlder.subjects[0].topics.find((t) => t.id === "only-a").order).toBe(4);
    expect(withOlder.sessions[0].topicId).toBe("t1");
    expect(merge(older, a)).toEqual(withOlder);

    const newer = copy({
      subjects: [subject("physics", [topic("t1", { updatedAt: at(5) })], { name: "Renamed", updatedAt: at(6) })],
      sessions: [session("s1", 18, { note: "edited later", updatedAt: at(19) })],
    });
    const withNewer = merge(a, newer);
    expect(withNewer.subjects[0].name).toBe("Renamed");
    expect(withNewer.subjects[0]).not.toHaveProperty("order");
    expect(withNewer.subjects[0].topics.find((t) => t.id === "t1")).not.toHaveProperty("notes");
    expect(withNewer.subjects[0].topics.find((t) => t.id === "only-a").order).toBe(4);
    expect(withNewer.sessions[0]).not.toHaveProperty("topicId");
    expect(merge(newer, a)).toEqual(withNewer);
  });

  // N9, the other half: an older build that restored this copy strips the
  // fields it doesn't know without restamping, so the two copies tie on
  // updatedAt. The tie must go to the copy with more fields, whichever side
  // it is on, or merging with the stripped copy spreads the stripping back.
  describe("on a stamp tie keeps the copy with more fields, so a stripped copy never wins", () => {
    const unstamped = (record) => {
      const bare = { ...record };
      delete bare.createdAt;
      delete bare.updatedAt;
      return bare;
    };
    const cases = {
      "stamped equal": { subjectExtra: { updatedAt: at(2) }, topicExtra: { updatedAt: at(3) }, sessionExtra: {} },
      "both unstamped": { subjectExtra: {}, topicExtra: {}, sessionExtra: null },
    };
    Object.entries(cases).forEach(([label, { subjectExtra, topicExtra, sessionExtra }]) => {
      it(label, () => {
        const sess = (extra) => (sessionExtra ? session("s1", 18, { ...sessionExtra, ...extra }) : unstamped(session("s1", 18, extra)));
        const full = copy({
          subjects: [subject("physics", [topic("t1", { notes: "n", ...topicExtra })], { order: 2, ...subjectExtra })],
          sessions: [sess({ topicId: "t1" })],
        });
        const stripped = copy({
          subjects: [subject("physics", [topic("t1", topicExtra)], subjectExtra)],
          sessions: [sess({})],
        });
        [merge(full, stripped), merge(stripped, full)].forEach((merged) => {
          expect(merged.subjects[0].order).toBe(2);
          expect(merged.subjects[0].topics[0].notes).toBe("n");
          expect(merged.sessions[0].topicId).toBe("t1");
        });
        expect(merge(full, stripped)).toEqual(merge(stripped, full));
        // The full copy is exactly what comes out, so the merge is idempotent on it.
        expect(merge(full, stripped).subjects).toEqual(full.subjects);
      });
    });
  });
});

// N19: subtasks are records. They merge one by one inside their topic, carry
// their own stamps and are deleted by their own tombstones (kind "subtasks",
// keyed subject::topic::subtask), so an edit to the topic on one copy no
// longer decides which copy's subtasks survive.
describe("subtasks merge as records (N19)", () => {
  const st = (id, extra = {}) => ({ id, name: id, done: false, ...extra });
  const stKey = (subjectId, topicId, subtaskId) => childKey(childKey(subjectId, topicId), subtaskId);
  const physics = (subtasks, topicExtra = {}, subjectExtra = {}) =>
    subject("physics", [topic("t1", { subtasks, ...topicExtra })], subjectExtra);
  const subtasksOf = (data) => data.subjects[0].topics[0].subtasks;
  const both = (a, b) => [merge(a, b), merge(b, a)];

  it("keeps a subtask added on one copy when the other ticks the topic, in both orders", () => {
    // The auditor's scenario: A adds a subtask offline, B ticks the topic.
    const a = copy({ subjects: [physics([st("s1"), st("s2", { createdAt: at(5), updatedAt: at(5) })])] });
    const b = copy({ subjects: [physics([st("s1")], { done: true, updatedAt: at(6) })] });
    both(a, b).forEach((merged) => {
      expect(ids(subtasksOf(merged))).toEqual(["s1", "s2"]);
      expect(merged.subjects[0].topics[0].done).toBe(true);
    });
    expect(merge(a, b)).toEqual(merge(b, a));
  });

  it("keeps a subtask added on one copy when the other ticked the topic first, in both orders", () => {
    const a = copy({ subjects: [physics([st("s1"), st("s2", { createdAt: at(7), updatedAt: at(7) })])] });
    const b = copy({ subjects: [physics([st("s1")], { done: true, updatedAt: at(6) })] });
    both(a, b).forEach((merged) => {
      expect(ids(subtasksOf(merged))).toEqual(["s1", "s2"]);
      expect(merged.subjects[0].topics[0].done).toBe(true);
    });
  });

  it("keeps subtasks added to the same topic on both copies", () => {
    const a = copy({ subjects: [physics([st("s1"), st("from-a", { updatedAt: at(5) })])] });
    const b = copy({ subjects: [physics([st("s1"), st("from-b", { updatedAt: at(4) })])] });
    both(a, b).forEach((merged) => expect(ids(subtasksOf(merged)).sort()).toEqual(["from-a", "from-b", "s1"]));
    expect(merge(a, b)).toEqual(merge(b, a));
  });

  it("takes the later edit per subtask, so a tick here and a tick there both survive", () => {
    const a = copy({ subjects: [physics([st("s1", { done: true, updatedAt: at(5) }), st("s2")])] });
    const b = copy({ subjects: [physics([st("s1"), st("s2", { done: true, updatedAt: at(6) })], { name: "Kinematics", updatedAt: at(7) })] });
    both(a, b).forEach((merged) => {
      expect(subtasksOf(merged).map((s) => s.done)).toEqual([true, true]);
      expect(merged.subjects[0].topics[0].name).toBe("Kinematics");
    });
  });

  it("does not bring back a subtask deleted on one copy when merged with an older copy, in both orders", () => {
    // The older copy ticked the topic before the delete; the delete stamps nothing on the topic.
    const older = copy({ subjects: [physics([st("s1"), st("s2", { updatedAt: at(3) })], { done: true, updatedAt: at(4) })] });
    const deleted = copy({
      subjects: [physics([st("s1")])],
      tombstones: addTombstone(emptyTombstones(), "subtasks", stKey("physics", "t1", "s2"), at(5)),
    });
    both(older, deleted).forEach((merged) => {
      expect(ids(subtasksOf(merged))).toEqual(["s1"]);
      expect(merged.subjects[0].topics[0].done).toBe(true);
      expect(merged.tombstones.subtasks).toEqual({ [stKey("physics", "t1", "s2")]: at(5) });
    });
    expect(merge(older, deleted)).toEqual(merge(deleted, older));
  });

  it("keeps a subtask that was edited after the other copy deleted it", () => {
    const edited = copy({ subjects: [physics([st("s1"), st("s2", { done: true, updatedAt: at(8) })])] });
    const deleted = copy({
      subjects: [physics([st("s1")])],
      tombstones: addTombstone(emptyTombstones(), "subtasks", stKey("physics", "t1", "s2"), at(5)),
    });
    both(edited, deleted).forEach((merged) => expect(ids(subtasksOf(merged))).toEqual(["s1", "s2"]));
  });

  it("does not confuse the same subtask id in two topics or two subjects", () => {
    const a = copy({
      subjects: [
        subject("physics", [topic("t1", { subtasks: [st("x")] }), topic("t2", { subtasks: [st("x")] })]),
        subject("maths", [topic("t1", { subtasks: [st("x")] })]),
      ],
    });
    const b = copy({ tombstones: addTombstone(emptyTombstones(), "subtasks", stKey("physics", "t1", "x"), at(4)) });
    both(a, b).forEach((merged) => {
      const [phys, maths] = ["physics", "maths"].map((id) => merged.subjects.find((s) => s.id === id));
      expect(phys.topics.map((t) => ids(t.subtasks))).toEqual([[], ["x"]]);
      expect(ids(maths.topics[0].subtasks)).toEqual(["x"]);
    });
  });

  it("does not let a subtask tombstone touch a topic or milestone with the same key", () => {
    const a = copy({
      subjects: [
        subject("physics", [topic("t1", { subtasks: [st("s1")] })], {
          milestones: [{ id: "t1", name: "NEA", kind: "nea", due: null, done: false }],
        }),
      ],
    });
    const b = copy({ tombstones: addTombstone(emptyTombstones(), "subtasks", childKey("physics", "t1"), at(4)) });
    both(a, b).forEach((merged) => {
      expect(ids(merged.subjects[0].topics)).toEqual(["t1"]);
      expect(ids(merged.subjects[0].milestones)).toEqual(["t1"]);
      expect(ids(subtasksOf(merged))).toEqual(["s1"]);
    });
  });

  it("keeps a deleted topic, and a deleted subject, whose subtasks were worked on after the deletion", () => {
    const worked = copy({ subjects: [physics([st("s1", { done: true, updatedAt: at(9) }), st("s2")])] });
    const topicGone = copy({ tombstones: addTombstone(emptyTombstones(), "topics", childKey("physics", "t1"), at(5)) });
    const subjectGone = copy({ tombstones: addTombstone(emptyTombstones(), "subjects", "physics", at(5)) });
    [...both(worked, topicGone), ...both(worked, subjectGone)].forEach((merged) => {
      expect(ids(subtasksOf(merged))).toEqual(["s1", "s2"]);
      expect(subtasksOf(merged)[0].done).toBe(true);
    });
    // Subtask edits from before the deletion don't bring it back.
    const stale = copy({ subjects: [physics([st("s1", { done: true, updatedAt: at(4) })])] });
    expect(merge(stale, topicGone).subjects[0].topics).toEqual([]);
    expect(merge(stale, subjectGone).subjects).toEqual([]);
  });

  it("keeps a subtask's unknown fields, and gives a stamp tie to the copy with more fields", () => {
    const full = copy({ subjects: [physics([st("s1", { weight: 2, updatedAt: at(3) }), st("s2", { weight: 1 })])] });
    const stripped = copy({ subjects: [physics([st("s1", { updatedAt: at(3) }), st("s2")])] });
    both(full, stripped).forEach((merged) => expect(subtasksOf(merged).map((s) => s.weight)).toEqual([2, 1]));
    expect(merge(full, stripped)).toEqual(merge(stripped, full));
    expect(merge(full, stripped).subjects).toEqual(full.subjects);

    const newer = copy({ subjects: [physics([st("s1", { name: "Renamed", updatedAt: at(4) })])] });
    both(full, newer).forEach((merged) => {
      expect(subtasksOf(merged)[0]).not.toHaveProperty("weight");
      expect(subtasksOf(merged)[1].weight).toBe(1);
    });
  });

  it("gives the same records whatever order three copies are merged in", () => {
    const a = copy({
      subjects: [physics([st("s1", { done: true, updatedAt: at(5) }), st("a-only", { updatedAt: at(4), weight: 1 })])],
    });
    const b = copy({
      subjects: [physics([st("s1"), st("b-only")], { done: true, updatedAt: at(6) })],
      tombstones: addTombstone(emptyTombstones(), "subtasks", stKey("physics", "t1", "a-only"), at(3)),
    });
    const c = copy({
      subjects: [physics([st("s1", { name: "tie", weight: 3 }), st("c-only", { updatedAt: at(7) })], { name: "Moments" })],
      tombstones: addTombstone(emptyTombstones(), "subtasks", stKey("physics", "t1", "b-only"), at(8)),
    });
    const flat = (data) => ({
      tombstones: data.tombstones,
      subjects: data.subjects.map((s) => ({
        ...s,
        topics: s.topics.map((t) => ({ ...t, subtasks: [...t.subtasks].sort((x, y) => (x.id < y.id ? -1 : 1)) })),
      })),
    });
    const orders = [
      merge(merge(a, b), c),
      merge(a, merge(b, c)),
      merge(merge(c, a), b),
      merge(merge(b, c), a),
      merge(c, merge(a, b)),
    ].map(flat);
    orders.forEach((result) => expect(result).toEqual(orders[0]));
    const [result] = orders;
    expect(result.subjects[0].topics[0]).toMatchObject({ done: true, name: "t1" });
    expect(ids(result.subjects[0].topics[0].subtasks)).toEqual(["a-only", "c-only", "s1"]);
    expect(result.subjects[0].topics[0].subtasks.find((s) => s.id === "s1").done).toBe(true);
  });

  it("is idempotent with subtasks, stamps and subtask tombstones", () => {
    const a = copy({
      subjects: [physics([st("s1", { done: true, updatedAt: at(5), weight: 2 }), st("s2")], { updatedAt: at(4) })],
      tombstones: addTombstone(emptyTombstones(), "subtasks", stKey("physics", "t1", "gone"), at(6)),
    });
    const once = merge(a, a);
    expect(once.subjects).toEqual(a.subjects);
    expect(once.tombstones).toEqual(a.tombstones);
    expect(merge(once, once)).toEqual(once);
  });

  it("two profiles converge on subtasks through backup files", () => {
    const laptop = copy({
      subjects: [physics([st("s1", { done: true, updatedAt: at(10) }), st("laptop", { updatedAt: at(11) }), st("s3")])],
      tombstones: addTombstone(emptyTombstones(), "subtasks", stKey("physics", "t1", "phone-old"), at(12)),
    });
    const phone = copy({
      subjects: [physics([st("s1"), st("phone-old", { updatedAt: at(9) }), st("phone", { updatedAt: at(13) }), st("s3")], { done: true, updatedAt: at(14) })],
      tombstones: addTombstone(emptyTombstones(), "subtasks", stKey("physics", "t1", "s3"), at(15)),
    });
    const exported = (profile) => {
      const restored = parseBackup(JSON.stringify(buildBackup({ ...profile, themeId: "midnight" })));
      return { subjects: restored.subjects, sessions: restored.sessions, tombstones: restored.tombstones, game: restored.game };
    };
    const onLaptop = merge(laptop, exported(phone));
    const onPhone = merge(phone, exported(laptop));
    expect(onLaptop).toEqual(onPhone);
    const t1 = onLaptop.subjects[0].topics[0];
    expect(t1.done).toBe(true);
    expect(ids(t1.subtasks).sort()).toEqual(["laptop", "phone", "s1"]);
    expect(t1.subtasks.find((s) => s.id === "s1").done).toBe(true);
    expect(merge(exported(onLaptop), exported(onPhone))).toEqual(onLaptop);
  });

  // Review B-R1 on #52: a build before N19 writes no subtask stamp or
  // tombstone; it stamps the topic. An unstamped subtask therefore belongs to
  // its topic copy's version, and the later-stamped topic copy decides it, as
  // on master. Subtasks this build stamps are unaffected.
  describe("unstamped subtasks follow their topic's stamp (B-R1)", () => {
    const stamped = st("a", { createdAt: at(1), updatedAt: at(1) });

    it("does not bring back a subtask an older build deleted, in both orders", () => {
      const newer = copy({ subjects: [physics([stamped, st("b")], { updatedAt: at(1) })] });
      const oldBuild = copy({ subjects: [physics([stamped], { updatedAt: at(5) })] });
      both(newer, oldBuild).forEach((merged) => expect(ids(subtasksOf(merged))).toEqual(["a"]));
      expect(merge(newer, oldBuild)).toEqual(merge(oldBuild, newer));
    });

    it("keeps an older build's untick of an unstamped subtask, in both orders", () => {
      const newer = copy({ subjects: [physics([stamped, st("b", { name: "B", done: true })], { updatedAt: at(1) })] });
      const oldBuild = copy({ subjects: [physics([stamped, st("b", { name: "B", done: false })], { updatedAt: at(5) })] });
      both(newer, oldBuild).forEach((merged) => expect(subtasksOf(merged)[1]).toEqual(st("b", { name: "B", done: false })));
      expect(merge(newer, oldBuild)).toEqual(merge(oldBuild, newer));
    });

    it("still unions unstamped subtasks when the topic stamps are equal", () => {
      const left = copy({ subjects: [physics([st("x")], { updatedAt: at(3) })] });
      const right = copy({ subjects: [physics([st("y")], { updatedAt: at(3) })] });
      both(left, right).forEach((merged) => expect(ids(subtasksOf(merged)).sort()).toEqual(["x", "y"]));
    });

    it("never drops a stamped subtask for an older topic copy", () => {
      const added = copy({ subjects: [physics([st("new", { createdAt: at(4), updatedAt: at(4) })], { updatedAt: at(1) })] });
      const ticked = copy({ subjects: [physics([], { done: true, updatedAt: at(6) })] });
      both(added, ticked).forEach((merged) => expect(ids(subtasksOf(merged))).toEqual(["new"]));
    });

    // Property test: random copies mixing stamped and unstamped subtasks,
    // different topic stamps and subtask tombstones. Commutative, idempotent
    // and the same records for every order three copies meet in.
    it("stays commutative, idempotent and three-copy order-independent", () => {
      let seed = 52;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
      const choose = (options) => options[Math.floor(rand() * options.length)];
      const withStamp = (record, value) => (value ? { ...record, updatedAt: value } : record);
      const randomCopy = () => {
        const subtasks = ["s1", "s2", "s3", "s4"]
          .filter(() => rand() > 0.3)
          .map((id) => withStamp(st(id, { name: choose(["a", "b"]), done: rand() > 0.5 }), choose([null, null, at(2), at(4), at(6)])));
        let tombstones = emptyTombstones();
        ["s1", "s2", "s3", "s4"].forEach((id) => {
          if (rand() < 0.2) tombstones = addTombstone(tombstones, "subtasks", stKey("physics", "t1", id), choose([at(3), at(5)]));
        });
        const topicFields = withStamp({ name: choose(["t1", "Moments"]) }, choose([null, at(3), at(5)]));
        return copy({ subjects: [physics(subtasks, topicFields)], tombstones });
      };
      const flat = (data) => ({
        tombstones: data.tombstones,
        subjects: data.subjects.map((s) => ({
          ...s,
          topics: s.topics.map((t) => ({ ...t, subtasks: [...t.subtasks].sort((x, y) => (x.id < y.id ? -1 : 1)) })),
        })),
      });
      for (let run = 0; run < 300; run += 1) {
        const [a, b, c] = [randomCopy(), randomCopy(), randomCopy()];
        expect(flat(merge(a, b))).toEqual(flat(merge(b, a)));
        const once = merge(a, b);
        expect(merge(once, once).subjects).toEqual(once.subjects);
        const results = [
          merge(merge(a, b), c),
          merge(a, merge(b, c)),
          merge(merge(a, c), b),
          merge(merge(b, c), a),
          merge(merge(c, a), b),
          merge(c, merge(a, b)),
          merge(b, merge(a, c)),
        ].map(flat);
        results.forEach((result) => expect(result).toEqual(results[0]));
      }
    });
  });

  // Review A-R1 on #52, a known limit pinned so a change to it is deliberate
  // (see instruction.md): a subtask edited after its topic's deletion brings
  // the topic back (work done since is never thrown away), so with three
  // copies the result can depend on merge order, as for a deleted subject.
  it("can forget one copy's topic rename when three copies meet around a deleted topic", () => {
    const deleted = copy({ tombstones: addTombstone(emptyTombstones(), "topics", childKey("physics", "t1"), at(5)) });
    const worked = copy({ subjects: [physics([st("y", { updatedAt: at(8) })], { name: "Old", updatedAt: at(1) })] });
    const renamed = copy({ subjects: [physics([st("x", { updatedAt: at(3) })], { name: "Renamed", updatedAt: at(3) })] });

    const dropFirst = merge(merge(deleted, renamed), worked).subjects[0].topics[0];
    const reviveFirst = merge(deleted, merge(worked, renamed)).subjects[0].topics[0];
    expect(dropFirst.name).toBe("Old");
    expect(ids(dropFirst.subtasks)).toEqual(["y"]);
    expect(reviveFirst.name).toBe("Renamed");
    expect(ids(reviveFirst.subtasks).sort()).toEqual(["x", "y"]);
    // Either way the work done after the deletion survives.
    [dropFirst, reviveFirst].forEach((result) => expect(result.subtasks.find((s) => s.id === "y")).toBeTruthy());
  });
});

// The readiness plan's Phase 1 exit test: two browser profiles export,
// merge and re-import each other's data deterministically, using only the
// fields on the records. If this holds offline, sync is a transport problem.
describe("exit test: two profiles converge through backup files", () => {
  const shared = [
    subject("physics", [topic("ph0"), topic("ph1"), topic("ph2")]),
    subject("maths", [topic("ma0"), topic("ma1")]),
  ];

  const laptop = copy({
    subjects: [
      subject(
        "physics",
        [topic("ph0", { done: true, updatedAt: at(10) }), topic("ph1"), topic("topic-laptop", { updatedAt: at(11), notes: "laptop only" })],
        // `order`, `notes`, `topicId` and `sharedWith`: fields a newer build wrote (N9).
        { name: "Physics (OCR A)", updatedAt: at(12), order: 1 }
      ),
      shared[1],
    ],
    sessions: [
      session("sess-shared", 9, { note: "laptop wording", updatedAt: at(13) }),
      session("sess-laptop", 18, { topicId: "ph0" }),
    ],
    tombstones: addTombstone(emptyTombstones(), "topics", childKey("physics", "ph2"), at(11)),
  });

  const phone = copy({
    subjects: [
      subject("physics", [topic("ph0"), topic("ph1", { done: true, updatedAt: at(14) }), topic("ph2")]),
      subject("custom-phone", [topic("custom-phone-topic-0", { updatedAt: at(15) })], { updatedAt: at(15), sharedWith: ["mum"] }),
    ],
    sessions: [
      session("sess-shared", 9, { note: "phone wording", updatedAt: at(12) }),
      session("sess-phone", 19),
      session("sess-deleted-on-laptop", 8),
    ],
    tombstones: addTombstone(emptyTombstones(), "subjects", "maths", at(15)),
  });
  laptop.tombstones = addTombstone(laptop.tombstones, "sessions", "sess-deleted-on-laptop", at(16));

  const exported = (profile) => {
    const restored = parseBackup(JSON.stringify(buildBackup({ ...profile, themeId: "midnight" })));
    return { subjects: restored.subjects, sessions: restored.sessions, tombstones: restored.tombstones, game: restored.game };
  };
  const comparable = (data) => ({
    ...data,
    subjects: [...data.subjects].sort((a, b) => (a.id < b.id ? -1 : 1)),
  });

  it("both profiles end with identical data, whichever imports the other's file", () => {
    const onLaptop = merge(laptop, exported(phone));
    const onPhone = merge(phone, exported(laptop));
    expect(comparable(onLaptop)).toEqual(comparable(onPhone));
    expect(ids(onLaptop.subjects)).toEqual(ids(onPhone.subjects));
  });

  it("the converged data is what each edit intended", () => {
    const merged = merge(laptop, exported(phone));
    const physics = merged.subjects.find((s) => s.id === "physics");

    expect(ids(merged.subjects).sort()).toEqual(["custom-phone", "physics"]);
    expect(physics.name).toBe("Physics (OCR A)");
    expect(ids(physics.topics).sort()).toEqual(["ph0", "ph1", "topic-laptop"]);
    expect(physics.topics.filter((t) => t.done).map((t) => t.id).sort()).toEqual(["ph0", "ph1"]);
    expect(ids(merged.sessions)).toEqual(["sess-phone", "sess-laptop", "sess-shared"]);
    expect(merged.sessions.find((s) => s.id === "sess-shared").note).toBe("laptop wording");
    expect(merged.game.currentStreak).toBe(2);
    // Fields neither build in this test knows came through the files and the merge untouched.
    expect(physics.order).toBe(1);
    expect(physics.topics.find((t) => t.id === "topic-laptop").notes).toBe("laptop only");
    expect(merged.sessions.find((s) => s.id === "sess-laptop").topicId).toBe("ph0");
    expect(merged.subjects.find((s) => s.id === "custom-phone").sharedWith).toEqual(["mum"]);
  });

  it("a second round trip changes nothing", () => {
    const first = merge(laptop, exported(phone));
    const again = merge(exported(first), exported(merge(phone, exported(laptop))));
    expect(comparable(again)).toEqual(comparable(first));
  });
});

describe("merging XP", () => {
  it("re-derives XP from the merged records and never double counts legacy XP", () => {
    const a = copy({ sessions: [session("a", 18)], game: { ...DEFAULT_GAME, totalXP: 130, legacyXP: 100 } });
    const b = copy({ sessions: [session("b", 19)], game: { ...DEFAULT_GAME, totalXP: 90, legacyXP: 60 } });
    const merged = merge(a, b);
    expect(merged.game.legacyXP).toBe(100);
    expect(merged.game.totalXP).toBe(100 + 30 + 30);
    expect(merge(b, a).game.totalXP).toBe(merged.game.totalXP);
  });

  it("settles a pre-derivation backup against its own records before merging", () => {
    const a = copy({ sessions: [session("a", 18)], game: { ...DEFAULT_GAME, totalXP: 30, legacyXP: 0 } });
    const b = copy({ sessions: [session("b", 19)], game: { totalXP: 530 } });
    expect(merge(a, b).game).toMatchObject({ legacyXP: 500, totalXP: 560 });
  });
});

describe("merging the streak", () => {
  it("is idempotent for a lapsed streak with freezes to spend", () => {
    const sessions = [session("s1", 1, { duration: 60 * 60 * 45 }), session("s2", 2)];
    const game = buildInitialGame({ currentStreak: 2, lastStudyDate: "2026-10-02", legacyXP: 0, frozenDates: [] }, sessions, [], NOW);
    expect(game).toMatchObject({ currentStreak: 0, freezesUsed: 3 });

    const a = copy({ sessions, game });
    const once = merge(a, a);
    expect(once.game).toEqual(game);
    expect(merge(once, once).game).toEqual(game);
  });
});
