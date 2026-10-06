import { describe, expect, it } from "vitest";
import { mergeData } from "./merge.js";
import { replaceData, stampPast } from "./replace.js";
import { DEFAULT_GAME } from "./gameLogic.js";
import { addTombstone, childKey, emptyTombstones, subtaskKey } from "./tombstones.js";

// N10: replacing data tombstones what it removes, keeps the tombstones here,
// and stamps what it puts in place only where another copy could beat it.
const at = (hour) => `2026-09-14T${String(hour).padStart(2, "0")}:00:00.000Z`;
const now = at(12);
const nowMs = Date.parse(now);
const topic = (id, done = false, updatedAt) => ({ id, name: id, done, subtasks: [], ...(updatedAt ? { updatedAt } : {}) });
const subject = (id, topics = [], extra = {}) => ({ id, name: id, color: "#123456", topics, ...extra });
const session = (id, note = "", updatedAt = at(9)) => ({ id, subjectId: "maths", duration: 600, date: at(9), note, tags: [], updatedAt });

const here = {
  subjects: [
    subject("maths", [topic("t1", true, at(10)), topic("t2")], { milestones: [{ id: "m1", name: "NEA", kind: "nea", due: null, done: false }] }),
    subject("physics"),
  ],
  sessions: [session("s1", "mine", at(10)), session("s2")],
  tombstones: addTombstone(emptyTombstones(), "sessions", "s-gone", at(8)),
};

// What another tab holding `here` ends with once it merges the replacement.
const otherTab = (replaced) =>
  mergeData({ ...here, game: DEFAULT_GAME }, { ...replaced, game: DEFAULT_GAME }, nowMs);

describe("replaceData", () => {
  it("tombstones every subject, topic, milestone and session it removes", () => {
    const next = { subjects: [subject("maths", [topic("t2")])], sessions: [session("s2")] };
    const replaced = replaceData(here, next, { now });
    expect(replaced.tombstones).toEqual({
      subjects: { physics: now },
      topics: { [childKey("maths", "t1")]: now },
      milestones: { [childKey("maths", "m1")]: now },
      sessions: { "s-gone": at(8), s1: now },
    });
    const merged = otherTab(replaced);
    expect(merged.subjects.map((s) => [s.id, s.topics.map((t) => t.id), s.milestones])).toEqual([["maths", ["t2"], undefined]]);
    expect(merged.sessions.map((s) => s.id)).toEqual(["s2"]);
  });

  it("replaces everything with nothing", () => {
    const replaced = replaceData(here, { subjects: [], sessions: [] }, { now });
    expect(replaced.subjects).toEqual([]);
    expect(Object.keys(replaced.tombstones.subjects)).toEqual(["maths", "physics"]);
    const merged = otherTab(replaced);
    expect([merged.subjects, merged.sessions]).toEqual([[], []]);
  });

  it("leaves a list the new data doesn't carry exactly as it is", () => {
    const replaced = replaceData(here, { subjects: [] }, { now });
    expect(replaced.sessions).toBe(here.sessions);
    expect(replaced.tombstones.sessions).toEqual(here.tombstones.sessions);
  });

  it("keeps the tombstones here beside the new data's, so a file from before tombstones forgets no delete", () => {
    const fileTombstones = addTombstone(emptyTombstones(), "sessions", "s-file-gone", at(7));
    const replaced = replaceData(here, { sessions: [], tombstones: fileTombstones }, { now });
    expect(replaced.tombstones.sessions).toMatchObject({ "s-gone": at(8), "s-file-gone": at(7) });
    const preV3 = replaceData(here, { sessions: [], tombstones: emptyTombstones() }, { now });
    expect(preV3.tombstones.sessions["s-gone"]).toBe(at(8));
  });

  it("stamps a record put in place when this device's copy is as new or newer, and only then", () => {
    const older = { ...here.sessions[0], note: "older", updatedAt: at(9) };
    const newer = { ...here.sessions[1], note: "newer", updatedAt: at(11) };
    const same = here.sessions[0];
    const replaced = replaceData(here, { sessions: [older, newer] }, { now });
    expect(replaced.sessions).toEqual([{ ...older, updatedAt: now }, newer]);
    expect(replaceData(here, { sessions: [same] }, { now }).sessions[0]).toBe(same);
    expect(otherTab(replaced).sessions.map((s) => s.note).sort()).toEqual(["newer", "older"]);
  });

  it("does the same for a subject's own fields, topics and milestones, separately", () => {
    const [maths] = here.subjects;
    const file = { ...maths, name: "Old name", topics: [topic("t1", false, at(9)), topic("t2")] };
    const [replaced] = replaceData(here, { subjects: [file] }, { now }).subjects;
    expect(replaced.updatedAt).toBe(now);
    expect(replaced.topics[0]).toEqual({ ...file.topics[0], updatedAt: now });
    expect(replaced.topics[1]).toBe(file.topics[1]);
    expect(replaced.milestones[0]).toBe(file.milestones[0]);
    const [merged] = otherTab({ ...here, subjects: [replaced], tombstones: here.tombstones }).subjects.filter((s) => s.id === "maths");
    expect([merged.name, merged.topics[0].done]).toEqual(["Old name", false]);
  });

  it("stamps a record past a tombstone that would otherwise remove it", () => {
    const tombstones = addTombstone(addTombstone(emptyTombstones(), "sessions", "s1", at(13)), "subjects", "maths", at(13));
    const replaced = replaceData({ ...here, tombstones }, { subjects: [here.subjects[0]], sessions: [here.sessions[0]] }, { now });
    expect(replaced.sessions[0].updatedAt).toBe("2026-09-14T13:00:00.001Z");
    expect(replaced.subjects[0].updatedAt).toBe("2026-09-14T13:00:00.001Z");
    const merged = mergeData({ ...here, tombstones, game: DEFAULT_GAME }, { ...replaced, game: DEFAULT_GAME }, nowMs);
    expect(merged.subjects.map((s) => s.id)).toEqual(["maths"]);
    expect(merged.sessions.map((s) => s.id)).toEqual(["s1"]);
  });

  // N19 made subtasks records: they merge one by one, apart from their topic.
  it("tombstones subtasks it drops from a topic it keeps, and stamps one another copy would beat", () => {
    const st = (id, done, updatedAt) => ({ id, name: id, done, updatedAt });
    const withSubtasks = (subtasks, topicExtra = {}) => ({
      ...here,
      subjects: [subject("maths", [{ ...topic("t1", true, at(10)), ...topicExtra, subtasks }])],
    });
    const mine = withSubtasks([st("a", true, at(10)), st("gone", false, at(10)), st("same", false, at(9))]);
    const file = [subject("maths", [{ ...topic("t1", true, at(10)), subtasks: [st("a", false, at(9)), st("same", false, at(9))] }])];
    const replaced = replaceData(mine, { subjects: file }, { now });
    expect(replaced.tombstones.subtasks).toEqual({ [subtaskKey("maths", "t1", "gone")]: now });
    const [a, same] = replaced.subjects[0].topics[0].subtasks;
    expect(a).toEqual({ ...file[0].topics[0].subtasks[0], updatedAt: now });
    expect(same).toBe(file[0].topics[0].subtasks[1]);
    // The topic's own fields are unchanged, so the topic keeps its stamp.
    expect(replaced.subjects[0].topics[0].updatedAt).toBe(at(10));
    const merged = mergeData({ ...mine, game: DEFAULT_GAME }, { ...replaced, game: DEFAULT_GAME }, nowMs);
    expect(merged.subjects[0].topics[0].subtasks.map((x) => [x.id, x.done])).toEqual([["a", false], ["same", false]]);
  });

  it("stamps a subtask past its tombstone, and a topic only on its own fields", () => {
    const st = { id: "a", name: "a", done: false, updatedAt: at(9) };
    const tombstones = addTombstone(emptyTombstones(), "subtasks", subtaskKey("maths", "t1", "a"), at(13));
    const mine = { ...here, tombstones, subjects: [subject("maths", [{ ...topic("t1", false, at(10)), subtasks: [] }])] };
    const file = [subject("maths", [{ ...topic("t1", false, at(10)), subtasks: [st] }])];
    const [t1] = replaceData(mine, { subjects: file }, { now }).subjects[0].topics;
    expect(t1.subtasks[0].updatedAt).toBe("2026-09-14T13:00:00.001Z");
    expect(t1.updatedAt).toBe(at(10));
  });

  it("writes no tombstones for the untouched placeholder subjects, and leaves the file's stamps alone", () => {
    const file = [{ ...here.subjects[0], name: "Theirs" }];
    const replaced = replaceData(here, { subjects: file }, { placeholder: true, now });
    expect(replaced.tombstones).toEqual(here.tombstones);
    expect(replaced.subjects[0]).toEqual(file[0]);
  });
});

describe("stampPast", () => {
  it("is now, or a millisecond past the latest of the given times", () => {
    expect(stampPast([at(9), null, ""], now)).toBe(now);
    expect(stampPast([at(13), at(9)], now)).toBe("2026-09-14T13:00:00.001Z");
  });
});
