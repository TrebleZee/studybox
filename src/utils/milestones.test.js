import { describe, expect, it } from "vitest";
import {
  allMilestones,
  convertTopicToMilestone,
  daysUntil,
  dueLabel,
  isOverdue,
  neaTopicCandidates,
} from "./milestones.js";

// Local-time constructors, so these read as calendar days wherever the test
// machine is (the app treats due dates as local days, e.g. Europe/London).
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

describe("daysUntil", () => {
  it("counts whole local calendar days", () => {
    const now = at(2027, 5, 10);
    expect(daysUntil("2027-05-10", now)).toBe(0);
    expect(daysUntil("2027-05-11", now)).toBe(1);
    expect(daysUntil("2027-05-13", now)).toBe(3);
    expect(daysUntil("2027-05-09", now)).toBe(-1);
    expect(daysUntil(null, now)).toBeNull();
    expect(daysUntil("2027-02-30", now)).toBeNull();
    expect(daysUntil("next week", now)).toBeNull();
  });

  it("does not flip around midnight", () => {
    expect(daysUntil("2027-05-11", at(2027, 5, 10, 23, 59))).toBe(1);
    expect(daysUntil("2027-05-11", at(2027, 5, 11, 0, 1))).toBe(0);
    expect(daysUntil("2027-05-11", at(2027, 5, 11, 23, 59))).toBe(0);
    expect(daysUntil("2027-05-11", at(2027, 5, 12, 0, 0))).toBe(-1);
  });

  it("stays whole across the clocks changing (UK: 28 March and 31 October 2027)", () => {
    expect(daysUntil("2027-03-29", at(2027, 3, 27, 0, 30))).toBe(2);
    expect(daysUntil("2027-11-01", at(2027, 10, 30, 23, 30))).toBe(2);
  });
});

describe("isOverdue and dueLabel", () => {
  const now = at(2027, 5, 10);
  it("is overdue only when dated, not done and before today", () => {
    expect(isOverdue({ due: "2027-05-09", done: false }, now)).toBe(true);
    expect(isOverdue({ due: "2027-05-10", done: false }, now)).toBe(false);
    expect(isOverdue({ due: "2027-05-09", done: true }, now)).toBe(false);
    expect(isOverdue({ due: null, done: false }, now)).toBe(false);
  });

  it("describes the due date relative to today", () => {
    expect(dueLabel({ due: "2027-05-10" }, now)).toBe("Due today");
    expect(dueLabel({ due: "2027-05-11" }, now)).toBe("Due tomorrow");
    expect(dueLabel({ due: "2027-05-15" }, now)).toBe("Due in 5 days");
    expect(dueLabel({ due: "2027-05-09" }, now)).toBe("Overdue by 1 day");
    expect(dueLabel({ due: "2027-05-01" }, now)).toBe("Overdue by 9 days");
    expect(dueLabel({ due: null }, now)).toBe("No date");
  });
});

describe("allMilestones", () => {
  it("flattens subjects, attaches the subject and sorts by due date with undated last", () => {
    const subjects = [
      { id: "a", name: "A", color: "#111", topics: [], milestones: [
        { id: "1", name: "Zed", due: null, done: false, kind: "other" },
        { id: "2", name: "Late", due: "2027-06-01", done: false, kind: "nea" },
      ] },
      { id: "b", name: "B", color: "#222", topics: [], milestones: [
        { id: "3", name: "Early", due: "2027-03-01", done: true, kind: "practical" },
        { id: "4", name: "Alpha", due: null, done: false, kind: "other" },
      ] },
      { id: "c", name: "C", color: "#333", topics: [] },
    ];
    const list = allMilestones(subjects);
    expect(list.map((m) => m.name)).toEqual(["Early", "Late", "Alpha", "Zed"]);
    expect(list[0]).toMatchObject({ subjectId: "b", subjectName: "B", subjectColor: "#222" });
  });
});

describe("NEA topics", () => {
  const cs = {
    id: "cs",
    name: "Computer Science",
    topics: [
      { id: "t1", name: "Algorithms", done: false, subtasks: [] },
      { id: "t2", name: "NEA Programming Project", done: true, subtasks: [] },
      { id: "t3", name: "Linear equations", done: false, subtasks: [] },
    ],
  };

  it("finds topics named NEA as whole words only", () => {
    expect(neaTopicCandidates([cs]).map((c) => c.topic.id)).toEqual(["t2"]);
    expect(neaTopicCandidates([{ ...cs, topics: [{ id: "x", name: "My nea draft" }] }])).toHaveLength(1);
  });

  it("converting replaces the topic with an undated NEA milestone of the same name", () => {
    const converted = convertTopicToMilestone(cs, "t2", "ms-1");
    expect(converted.topics.map((t) => t.id)).toEqual(["t1", "t3"]);
    expect(converted.milestones).toEqual([
      { id: "ms-1", name: "NEA Programming Project", kind: "nea", due: null, done: true },
    ]);
    expect(convertTopicToMilestone(cs, "nope")).toBe(cs);
  });
});
