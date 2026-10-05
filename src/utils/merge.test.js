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
    const a = copy({ subjects: [subject("c", [topic("t1"), topic("t2", { done: true, updatedAt: at(9) })])] });
    const b = copy({ tombstones: addTombstone(emptyTombstones(), "subjects", "c", at(4)) });
    const c = copy({
      subjects: [subject("c", [topic("t1"), topic("t2", { updatedAt: at(3) })], { name: "C2", updatedAt: at(5) })],
      sessions: [session("s", 6)],
    });
    const flat = (data) => ({
      sessions: data.sessions,
      tombstones: data.tombstones,
      subjects: data.subjects.map((s) => ({ ...s, topics: [...s.topics].sort((x, y) => (x.id < y.id ? -1 : 1)) })),
    });
    const leftFirst = merge(merge(a, b), c);
    expect(flat(merge(a, merge(b, c)))).toEqual(flat(leftFirst));
    expect(flat(merge(merge(c, a), b))).toEqual(flat(leftFirst));
    expect(leftFirst.subjects[0].topics.find((t) => t.id === "t2").done).toBe(true);
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
      subjects: [subject("physics", [topic("t1", { updatedAt: at(3) })], { updatedAt: at(2) })],
      sessions: [session("s1", 18), session("s2", 19)],
      tombstones: addTombstone(emptyTombstones(), "sessions", "gone", at(4)),
    });
    const once = merge(a, a);
    expect(once.subjects).toEqual(a.subjects);
    expect(once.sessions).toEqual([...a.sessions].reverse());
    expect(merge(once, once)).toEqual(once);
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
        [topic("ph0", { done: true, updatedAt: at(10) }), topic("ph1"), topic("topic-laptop", { updatedAt: at(11) })],
        { name: "Physics (OCR A)", updatedAt: at(12) }
      ),
      shared[1],
    ],
    sessions: [
      session("sess-shared", 9, { note: "laptop wording", updatedAt: at(13) }),
      session("sess-laptop", 18),
    ],
    tombstones: addTombstone(emptyTombstones(), "topics", childKey("physics", "ph2"), at(11)),
  });

  const phone = copy({
    subjects: [
      subject("physics", [topic("ph0"), topic("ph1", { done: true, updatedAt: at(14) }), topic("ph2")]),
      subject("custom-phone", [topic("custom-phone-topic-0", { updatedAt: at(15) })], { updatedAt: at(15) }),
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
