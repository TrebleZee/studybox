import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseBackup } from "./backup.js";
import { subjectsForTemplate } from "./catalogue.js";
import {
  defaultSubjects,
  isUntouchedDefaultSubjects,
  normalizeSessions,
  normalizeSubjects,
} from "./subjects.js";

// N13: normalizers coerce or drop fields of the wrong type. Valid data of
// every backup version must normalize exactly as it did before that change;
// the snapshot below was recorded on v1.17.1, before the normalizers changed.

const STAMP = "2026-09-01T10:00:00.000Z";

const v1Subjects = [
  {
    id: "physics",
    name: "Physics",
    exam: "OCR A",
    color: "#4F9CF9",
    topics: [{ id: "ph0", name: "Foundations", done: true, subtasks: [] }],
  },
  { id: "custom-1", name: "Latin", exam: "My tutor", color: "#ff0000", topics: [] },
  // Older records with missing or empty fields fall back to defaults.
  { id: "custom-2", name: "", topics: [{ id: "c2-0", name: "", subtasks: [{ name: "" }] }, {}] },
  {},
];

const v2Subjects = [
  {
    id: "m",
    name: "Maths",
    board: "Edexcel",
    qualification: "gcse",
    spec: "1MA1",
    specName: null,
    tier: "higher",
    exam: "Edexcel",
    color: "#22C55E",
    papers: [{ id: "p1", name: "Paper 1", examDate: "2027-05-20" }, { id: "p2", name: "" }],
    examYear: 2027,
    topics: [
      { id: "m0", name: "Number", done: false, subtasks: [{ id: "m0-st0", name: "Fractions", done: true }], paper: ["p1", "p2"] },
      { id: "m1", name: "Proof", done: true, subtasks: [], paper: "p2", higherOnly: true, catalogueTopicId: "edexcel-1ma1-t01" },
      { id: "m2", name: "NEA", done: false, subtasks: [], keepAsTopic: true },
    ],
  },
];

const v3Subjects = [
  {
    id: "custom-2f0c3a2e-1111-4a4a-9b9b-222222222222",
    name: "Computer Science",
    board: "OCR",
    qualification: "alevel",
    spec: "H446",
    specName: null,
    tier: null,
    exam: "OCR",
    color: "#A855F7",
    createdAt: STAMP,
    updatedAt: STAMP,
    milestones: [
      { id: "ms-1", name: "NEA draft", kind: "nea", due: "2027-03-01", done: false, catalogueMilestoneId: "ocr-h446-m01", createdAt: STAMP, updatedAt: STAMP },
      { name: "Practical", kind: "practical", due: "not a date", done: 1 },
    ],
    topics: [{ id: "cs0", name: "Algorithms", done: true, subtasks: [], createdAt: STAMP, updatedAt: STAMP }],
  },
];

const sessions = [
  // v1: no note or tags yet.
  { id: "1690000000000", subjectId: "physics", subjectName: "Physics", subjectColor: "#4F9CF9", duration: 1500, date: STAMP },
  // v2: note and tags, a string duration.
  { id: "s2", subjectId: "m", subjectName: "Maths", subjectColor: "#22C55E", duration: "900", date: STAMP, note: "Past paper 1", tags: ["Past papers", "", "Recap"] },
  // v3: stamped.
  { id: "session-abc", subjectId: "custom-x", subjectName: "CS", subjectColor: "#A855F7", duration: 61, date: STAMP, note: "", tags: [], createdAt: STAMP, updatedAt: STAMP },
  {},
];

describe("valid data normalizes exactly as before (N13)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(STAMP));
  });
  afterEach(() => vi.useRealTimers());

  it("for subjects of every version, the defaults and a catalogue template", async () => {
    vi.useRealTimers();
    const gcse = await subjectsForTemplate("gcse");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(STAMP));
    expect(
      normalizeSubjects([...v1Subjects, ...v2Subjects, ...v3Subjects, ...defaultSubjects(), ...gcse])
    ).toMatchSnapshot();
    expect(normalizeSubjects(undefined)).toMatchSnapshot();
  });

  it("for sessions of every version", () => {
    expect(normalizeSessions(sessions)).toMatchSnapshot();
  });

  it("through a backup file", () => {
    const file = { version: 3, subjects: [...v1Subjects, ...v3Subjects], sessions, tombstones: {} };
    expect(parseBackup(JSON.stringify(file))).toMatchSnapshot();
  });

  it("is idempotent, and keeps the onboarding guard working", () => {
    const once = normalizeSubjects([...v1Subjects, ...v2Subjects, ...v3Subjects]);
    expect(normalizeSubjects(once)).toEqual(once);
    expect(normalizeSessions(normalizeSessions(sessions))).toEqual(normalizeSessions(sessions));
    expect(isUntouchedDefaultSubjects(defaultSubjects())).toBe(true);
    expect(isUntouchedDefaultSubjects(normalizeSubjects(defaultSubjects()))).toBe(true);
  });
});

describe("wrong-type fields are replaced (N13)", () => {
  const evil = { evil: true };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(STAMP));
  });
  afterEach(() => vi.useRealTimers());

  it("on subjects, topics, subtasks and milestones", () => {
    const [subject, second] = normalizeSubjects([
      {
        id: "p",
        name: evil,
        exam: "Custom",
        color: evil,
        topics: [
          { id: "t", name: evil, done: true, subtasks: [{ id: evil, name: ["x"] }] },
          { id: ["x"], name: 42, subtasks: "x" },
          "not a topic",
        ],
        milestones: [{ id: "m", name: evil, kind: "nea" }],
      },
      { id: evil, name: "Kept", topics: evil },
    ]);
    expect(subject).toMatchObject({ id: "p", name: "Untitled subject", color: "#4F9CF9" });
    expect(subject.topics).toEqual([
      {
        id: "t",
        name: "Untitled topic",
        done: true,
        subtasks: [{ id: "t-st0", name: "Untitled subtask", done: false }],
      },
      { id: "p-1", name: "Untitled topic", done: false, subtasks: [] },
      { id: "p-2", name: "Untitled topic", done: false, subtasks: [] },
    ]);
    expect(subject.milestones[0].name).toBe("Untitled milestone");
    expect(second.id).toMatch(/^sub-/);
    expect(second).toMatchObject({ name: "Kept", topics: [] });
  });

  it("on sessions", () => {
    const [session] = normalizeSessions([
      {
        id: evil,
        subjectId: evil,
        subjectName: evil,
        subjectColor: evil,
        duration: 60,
        date: evil,
        note: ["x"],
        tags: [evil, "Recap", 7, null, ""],
      },
    ]);
    expect(session).toMatchObject({
      subjectId: "",
      subjectName: "",
      subjectColor: "#888888",
      duration: 60,
      date: STAMP,
      note: "",
      tags: ["Recap"],
    });
    expect(session.id).toMatch(/^sess-/);
    expect(normalizeSessions([{ tags: "Recap" }])[0].tags).toEqual([]);
  });

  it("leave nothing for a second pass to change", () => {
    const once = normalizeSessions([{ id: "s", subjectName: evil, tags: [evil] }]);
    expect(normalizeSessions(once)).toEqual(once);
  });
});
