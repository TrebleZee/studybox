import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildBackup, parseBackup } from "./backup.js";
import { normalizeGame } from "./gameLogic.js";
import { isJsonValue, unknownFields } from "./records.js";
import {
  defaultSubjects,
  isUntouchedDefaultSubjects,
  normalizeSessions,
  normalizeSubjects,
} from "./subjects.js";
import { emptyTombstones, mergeTombstones, normalizeTombstones } from "./tombstones.js";

// N9: a record written by a newer build carries fields this build has never
// heard of. The normalizers keep them (as plain JSON values, never read), so
// the record round-trips through an older build unchanged instead of being
// silently stripped on the next write.

const STAMP = "2026-09-01T10:00:00.000Z";

// The auditor's scenario, plus one unknown field per record kind. Written as
// a newer build would store it: fully normalized, plus the fields it added.
const newerSubject = () => ({
  id: "custom-physics",
  name: "Physics",
  qualification: "alevel",
  board: "OCR",
  spec: "H556",
  specName: "Physics A",
  tier: null,
  exam: "OCR Physics A",
  color: "#4F9CF9",
  order: 2,
  sharedWith: ["friend-1", { id: "friend-2", role: "viewer" }],
  createdAt: STAMP,
  updatedAt: STAMP,
  papers: [{ id: "p1", name: "Paper 1", weighting: 0.5 }],
  milestones: [
    { id: "m1", name: "Practical", kind: "practical", due: null, done: false, attachments: [], createdAt: STAMP, updatedAt: STAMP },
  ],
  topics: [
    {
      id: "ph0",
      name: "Forces",
      done: false,
      order: 1,
      notes: "see p.12",
      subtasks: [{ id: "ph0-st0", name: "Read", done: false, weight: 2, createdAt: STAMP, updatedAt: STAMP }],
      createdAt: STAMP,
      updatedAt: STAMP,
    },
  ],
});

const newerSession = () => ({
  id: "s1",
  subjectId: "custom-physics",
  subjectName: "Physics",
  subjectColor: "#4F9CF9",
  duration: 1800,
  date: STAMP,
  note: "",
  tags: [],
  topicId: "ph0",
  localDay: { date: "2026-09-01", zone: "Europe/London" },
  createdAt: STAMP,
  updatedAt: STAMP,
});

describe("unknown fields on records (N9)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(STAMP));
  });
  afterEach(() => vi.useRealTimers());

  it("are kept on subjects, papers, milestones, topics and subtasks, exactly as stored", () => {
    const [subject] = normalizeSubjects([newerSubject()]);
    expect(subject.order).toBe(2);
    expect(subject.sharedWith).toEqual(["friend-1", { id: "friend-2", role: "viewer" }]);
    expect(subject.papers[0].weighting).toBe(0.5);
    expect(subject.milestones[0].attachments).toEqual([]);
    expect(subject.topics[0]).toMatchObject({ order: 1, notes: "see p.12" });
    expect(subject.topics[0].subtasks[0]).toMatchObject({ weight: 2, createdAt: STAMP, updatedAt: STAMP });
  });

  it("are kept on sessions", () => {
    const [session] = normalizeSessions([newerSession()]);
    expect(session.topicId).toBe("ph0");
    expect(session.localDay).toEqual({ date: "2026-09-01", zone: "Europe/London" });
  });

  it("round-trip: a newer build's record normalizes to the same JSON it was stored as", () => {
    const sorted = (value) =>
      JSON.stringify(value, (_, v) =>
        v && typeof v === "object" && !Array.isArray(v)
          ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
          : v
      );
    expect(sorted(normalizeSubjects([newerSubject()]))).toBe(sorted([newerSubject()]));
    expect(sorted(normalizeSessions([newerSession()]))).toBe(sorted([newerSession()]));
  });

  it("normalize the same the second time, and the onboarding guard still holds", () => {
    const once = normalizeSubjects([newerSubject()]);
    expect(normalizeSubjects(once)).toEqual(once);
    const sessions = normalizeSessions([newerSession()]);
    expect(normalizeSessions(sessions)).toEqual(sessions);
    expect(isUntouchedDefaultSubjects(defaultSubjects())).toBe(true);
    expect(normalizeSubjects(defaultSubjects())).toEqual(normalizeSubjects(normalizeSubjects(defaultSubjects())));
    // A default subject a newer build has annotated is no longer "untouched".
    const [first, ...rest] = defaultSubjects();
    expect(isUntouchedDefaultSubjects([{ ...first, order: 0 }, ...rest])).toBe(false);
  });

  it("do not weaken the checks on known fields (N13 still holds beside them)", () => {
    const [subject] = normalizeSubjects([
      {
        ...newerSubject(),
        id: "custom-9",
        name: { evil: true },
        examYear: "2027",
        topics: [
          { id: "t", name: 42, done: "yes", subtasks: "x", paper: 7, higherOnly: false, keepAsTopic: "yes", notes: "kept" },
        ],
      },
    ]);
    expect(subject.name).toBe("Untitled subject");
    expect(subject).not.toHaveProperty("examYear");
    expect(subject.order).toBe(2);
    expect(subject.topics[0]).toEqual({ id: "t", name: "Untitled topic", done: true, subtasks: [], notes: "kept" });

    const [session] = normalizeSessions([{ ...newerSession(), subjectName: ["x"], tags: "x", duration: "900" }]);
    expect(session).toMatchObject({ subjectName: "", tags: [], duration: 900, topicId: "ph0" });
  });

  it("drop values that are not JSON, and a key named __proto__", () => {
    class Thing {}
    const [subject] = normalizeSubjects([
      {
        ...newerSubject(),
        fn: () => {},
        missing: undefined,
        sym: Symbol("x"),
        nan: NaN,
        inf: Infinity,
        when: new Date(STAMP),
        thing: new Thing(),
        list: [1, () => {}],
        nested: { ok: true, bad: undefined },
        holes: [1, undefined],
        keptNull: null,
        keptNested: { a: [1, "two", null, { b: false }] },
      },
    ]);
    ["fn", "missing", "sym", "nan", "inf", "when", "thing", "list", "nested", "holes"].forEach((key) =>
      expect(subject).not.toHaveProperty(key)
    );
    expect(subject.keptNull).toBeNull();
    expect(subject.keptNested).toEqual({ a: [1, "two", null, { b: false }] });

    const hostile = JSON.parse('{"id":"h","name":"H","exam":"Custom","topics":[],"__proto__":{"polluted":true}}');
    const [normalized] = normalizeSubjects([hostile]);
    expect(Object.hasOwn(normalized, "__proto__")).toBe(false);
    expect(Object.getPrototypeOf(normalized)).toBe(Object.prototype);
    expect({}.polluted).toBeUndefined();
  });

  it("survive a backup file and a restore", () => {
    const subjects = normalizeSubjects([newerSubject()]);
    const sessions = normalizeSessions([newerSession()]);
    const file = JSON.stringify(buildBackup({ subjects, sessions, themeId: "midnight", game: normalizeGame({}), tombstones: emptyTombstones() }));
    const restored = parseBackup(file);
    expect(restored.subjects).toEqual(subjects);
    expect(restored.sessions).toEqual(sessions);
    expect(restored.subjects[0].topics[0].notes).toBe("see p.12");
  });
});

describe("unknown tombstone kinds (N9)", () => {
  const known = emptyTombstones();

  it("are kept when they are id -> deletion time maps, so a newer build's deletes survive this one", () => {
    const stored = { ...known, subtasks: { "physics::ph0::st0": STAMP }, notes: { n1: STAMP, bad: "yesterday", 7: 3 } };
    const normalized = normalizeTombstones(stored);
    expect(normalized.subtasks).toEqual({ "physics::ph0::st0": STAMP });
    expect(normalized.notes).toEqual({ n1: STAMP });
    expect(normalizeTombstones(normalized)).toEqual(normalized);
  });

  it("are dropped when empty or not a map, and the known shape is unchanged", () => {
    expect(normalizeTombstones({ ...known, subtasks: {}, other: "x", list: [STAMP], nil: null })).toEqual(known);
    expect(normalizeTombstones({})).toEqual(known);
    const hostile = JSON.parse(`{"subjects":{},"__proto__":{"x":"${STAMP}"}}`);
    expect(Object.hasOwn(normalizeTombstones(hostile), "__proto__")).toBe(false);
    expect({}.x).toBeUndefined();
  });

  it("merge like the known kinds: per id the later deletion wins, whichever side has it", () => {
    const later = "2026-09-02T10:00:00.000Z";
    const a = { ...known, subtasks: { x: STAMP, onlyA: STAMP } };
    const b = { ...known, subtasks: { x: later }, notes: { n: STAMP } };
    const ab = mergeTombstones(a, b);
    expect(ab.subtasks).toEqual({ onlyA: STAMP, x: later });
    expect(ab.notes).toEqual({ n: STAMP });
    expect(mergeTombstones(b, a)).toEqual(ab);
    expect(mergeTombstones(ab, ab)).toEqual(ab);
    expect(mergeTombstones(known, known)).toEqual(known);
  });
});

describe("unknownFields and isJsonValue", () => {
  it("return only own keys outside the known set, with JSON values", () => {
    const record = { id: "a", name: "b", extra: 1, bad: () => {}, nested: { deep: [true] } };
    expect(unknownFields(record, new Set(["id", "name"]))).toEqual({ extra: 1, nested: { deep: [true] } });
    expect(unknownFields(null, new Set())).toEqual({});
    expect(unknownFields("text", new Set())).toEqual({});
  });

  it("accept exactly what JSON.parse can produce", () => {
    [null, true, 0, -1.5, "", "x", [], {}, [1, "a", null], { a: { b: [] } }, Object.create(null)].forEach((value) =>
      expect(isJsonValue(value)).toBe(true)
    );
    const cyclic = {};
    cyclic.self = cyclic;
    [undefined, NaN, Infinity, () => {}, Symbol("s"), 10n, new Date(), new Map(), [undefined], { a: undefined }, cyclic].forEach(
      (value) => expect(isJsonValue(value)).toBe(false)
    );
  });
});
