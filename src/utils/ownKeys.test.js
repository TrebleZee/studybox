import { afterEach, describe, expect, it } from "vitest";
import { buildBackup, parseBackup } from "./backup.js";
import { deriveXP, normalizeGame } from "./gameLogic.js";
import { mergeData } from "./merge.js";
import { normalizeSessions, normalizeSubjects, subjectLabel } from "./subjects.js";
import { scopeOf } from "../store/localStore.js";

// Ids come from storage and imported files, so they can be any string,
// including the names of Object.prototype members (N6).
const HOSTILE_IDS = ["__proto__", "constructor", "toString", "hasOwnProperty"];

const hostileSubject = (id) => ({
  id,
  name: `Subject ${id}`,
  exam: "OCR A-level Physics A",
  color: "#60A5FA",
  tier: id,
  qualification: id,
  topics: [
    { id, name: `Topic ${id}`, done: true, subtasks: [{ id, name: "Sub", done: false }] },
  ],
  milestones: [{ id, name: `Milestone ${id}`, kind: id, due: "2027-03-01", done: false }],
});

const hostileSession = (id) => ({
  id,
  subjectId: id,
  subjectName: `Subject ${id}`,
  duration: 1800,
  date: "2026-10-01T10:00:00.000Z",
});

const prototypeSnapshot = () => Object.getOwnPropertyNames(Object.prototype).sort();
const before = prototypeSnapshot();

afterEach(() => {
  expect(prototypeSnapshot()).toEqual(before);
  expect({}.polluted).toBeUndefined();
});

describe("ids named after Object.prototype members (N6)", () => {
  it.each(HOSTILE_IDS)("normalizeSubjects keeps a subject, topic and milestone with id %s", (id) => {
    const [subject] = normalizeSubjects([hostileSubject(id)]);
    expect(subject.id).toBe(id);
    expect(subject.topics.map((topic) => topic.id)).toEqual([id]);
    expect(subject.milestones.map((milestone) => milestone.id)).toEqual([id]);
    expect(subject.milestones[0].kind).toBe("other");
    expect(subject.tier).toBeNull();
    expect(typeof subjectLabel(subject)).toBe("string");
  });

  it.each(HOSTILE_IDS)("normalizeSubjects never borrows preset metadata for id %s", (id) => {
    const [subject] = normalizeSubjects([{ id, name: "Mine", exam: "", color: "#888888" }]);
    expect(subject.board).toBe("Custom");
    expect(subject.topics).toEqual([]);
  });

  it("parseBackup accepts every hostile id on subjects, topics, milestones and sessions", () => {
    // Written as text: an object literal's "__proto__" key would set the
    // prototype instead of becoming a property.
    const file = JSON.stringify({
      version: 3,
      subjects: HOSTILE_IDS.map(hostileSubject),
      sessions: HOSTILE_IDS.map(hostileSession),
    }).replace(/}$/, ',"tombstones":{"sessions":{"__proto__":"2026-10-01T10:00:00.000Z"}}}');
    const restored = parseBackup(file);
    expect(restored.subjects.map((subject) => subject.id)).toEqual(HOSTILE_IDS);
    expect(restored.sessions.map((session) => session.id)).toEqual(HOSTILE_IDS);
    expect(Object.hasOwn(restored.tombstones.sessions, "__proto__")).toBe(true);
  });

  it("round-trips, merges and scores records with hostile ids", () => {
    const subjects = normalizeSubjects(HOSTILE_IDS.map(hostileSubject));
    const sessions = normalizeSessions(HOSTILE_IDS.map(hostileSession));
    const game = normalizeGame({});
    const restored = parseBackup(
      JSON.stringify(buildBackup({ subjects, sessions, themeId: "dark", game }))
    );
    expect(restored.subjects).toEqual(subjects);
    expect(restored.sessions).toEqual(sessions);

    const merged = mergeData(
      { subjects, sessions, tombstones: restored.tombstones, game },
      { ...restored, game: restored.game || game }
    );
    expect(merged.subjects.map((subject) => subject.id)).toEqual(HOSTILE_IDS);
    expect(merged.sessions.map((session) => session.id).sort()).toEqual([...HOSTILE_IDS].sort());
    expect(Number.isFinite(deriveXP(sessions, subjects))).toBe(true);
  });

  it.each(HOSTILE_IDS)("scopeOf treats the unknown key %s as device scope", (key) => {
    expect(scopeOf(key)).toBe("device");
  });
});
