import { afterAll, beforeAll, describe, expect, it } from "vitest";
import PUBLISHED from "../data/exam-dates-2027.json";
import {
  countdownLabel,
  elapsedPercent,
  hasExamDates,
  nextExam,
  pace,
  paperExamDate,
  publishedExamDate,
  specIdOf,
  subjectExams,
  topicsLeft,
  weeksLeft,
} from "./pacing.js";
import { isIsoDate, normalizeSubjects } from "./subjects.js";

// Local-time constructors, so these read as calendar days wherever the test
// machine is. The Europe/London block below pins the zone explicitly.
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

const DATES = {
  "aqa-8300": { p1: "2027-05-14", p2: "2027-05-27", p3: "2027-06-14" },
  "ocr-h556": { p1: "2027-06-01" },
};

const topics = (count, done = 0, extra = {}) =>
  Array.from({ length: count }, (_, i) => ({ id: `t${i}`, name: `T${i}`, done: i < done, subtasks: [], ...extra }));

const maths = (overrides = {}) => ({
  id: "gcse-maths",
  name: "Maths",
  board: "AQA",
  spec: "8300",
  tier: "higher",
  papers: [
    { id: "p1", name: "Paper 1" },
    { id: "p2", name: "Paper 2" },
    { id: "p3", name: "Paper 3" },
  ],
  topics: topics(10),
  ...overrides,
});

const physics = (overrides = {}) => ({
  id: "physics",
  name: "Physics",
  board: "OCR",
  spec: "H556",
  papers: [{ id: "p1", name: "Modelling physics" }],
  topics: topics(4),
  ...overrides,
});

describe("exam dates", () => {
  it("files published dates under the lowercase catalogue spec id", () => {
    expect(specIdOf(maths())).toBe("aqa-8300");
    expect(specIdOf({ board: "Custom", spec: null })).toBeNull();
    expect(specIdOf({})).toBeNull();
  });

  it("uses the published date unless the user set their own", () => {
    const subject = maths();
    expect(paperExamDate(subject, subject.papers[0], DATES)).toBe("2027-05-14");
    expect(paperExamDate(subject, { id: "p1", examDate: "2027-05-20" }, DATES)).toBe("2027-05-20");
    expect(publishedExamDate(subject, { id: "p1", examDate: "2027-05-20" }, DATES)).toBe("2027-05-14");
    // An invalid user value falls back to the published date.
    expect(paperExamDate(subject, { id: "p1", examDate: "2027-02-30" }, DATES)).toBe("2027-05-14");
    expect(paperExamDate(subject, { id: "p9" }, DATES)).toBeNull();
  });

  it("lists a subject's dated papers earliest first", () => {
    const subject = maths({
      papers: [
        { id: "p3", name: "Paper 3" },
        { id: "p1", name: "Paper 1", examDate: "2027-06-20" },
        { id: "p2", name: "Paper 2" },
      ],
    });
    expect(subjectExams(subject, DATES).map((exam) => [exam.paperId, exam.date])).toEqual([
      ["p2", "2027-05-27"],
      ["p3", "2027-06-14"],
      ["p1", "2027-06-20"],
    ]);
  });

  it("has no dates for subjects without papers or off-catalogue specs", () => {
    const custom = { id: "c", name: "Latin", board: "Custom", spec: null, topics: topics(3) };
    const noPapers = maths({ papers: undefined });
    expect(hasExamDates([custom, noPapers], DATES)).toBe(false);
    expect(nextExam([custom, noPapers], at(2027, 1, 1), DATES)).toBeNull();
    expect(pace(custom, at(2027, 1, 1), DATES)).toBeNull();
  });

  it("a user date alone is enough, even off the catalogue", () => {
    const custom = {
      id: "c",
      name: "Latin",
      board: "Custom",
      papers: [{ id: "x", name: "Unseen", examDate: "2027-06-03" }],
      topics: topics(3),
    };
    expect(hasExamDates([custom], DATES)).toBe(true);
    expect(nextExam([custom], at(2027, 5, 1), DATES)).toMatchObject({ date: "2027-06-03", subjectName: "Latin" });
  });
});

describe("nextExam", () => {
  it("finds the earliest exam still to come across subjects", () => {
    const next = nextExam([physics(), maths()], at(2027, 5, 1), DATES);
    expect(next).toMatchObject({
      subjectId: "gcse-maths",
      subjectName: "Maths",
      paperId: "p1",
      paperName: "Paper 1",
      date: "2027-05-14",
      days: 13,
    });
  });

  it("skips past exams and returns null once every exam has gone", () => {
    expect(nextExam([physics(), maths()], at(2027, 5, 28), DATES)).toMatchObject({
      subjectId: "physics",
      date: "2027-06-01",
    });
    expect(nextExam([physics(), maths()], at(2027, 6, 15), DATES)).toBeNull();
    expect(hasExamDates([physics(), maths()], DATES)).toBe(true);
  });

  it("labels the countdown in words for today and tomorrow", () => {
    expect([0, 1, 2, 13].map(countdownLabel)).toEqual(["today", "tomorrow", "in 2d", "in 13d"]);
  });

  it("counts an exam as next all through its own day", () => {
    expect(nextExam([maths()], at(2027, 5, 14, 23, 59), DATES)).toMatchObject({ paperId: "p1", days: 0 });
  });
});

describe("weeksLeft and topicsLeft", () => {
  it("rounds weeks up and is null for a past or missing date", () => {
    const now = at(2027, 5, 1);
    expect(weeksLeft("2027-05-01", now)).toBe(0);
    expect(weeksLeft("2027-05-04", now)).toBe(1);
    expect(weeksLeft("2027-05-08", now)).toBe(1);
    expect(weeksLeft("2027-05-09", now)).toBe(2);
    expect(weeksLeft("2027-04-30", now)).toBeNull();
    expect(weeksLeft(null, now)).toBeNull();
  });

  it("counts only in-tier topics that are not done", () => {
    const foundation = maths({
      tier: "foundation",
      topics: [...topics(4, 1), ...topics(3, 0, { higherOnly: true }).map((t) => ({ ...t, id: `h${t.id}` }))],
    });
    expect(topicsLeft(foundation)).toBe(3);
    expect(topicsLeft({ ...foundation, tier: "higher" })).toBe(6);
  });
});

describe("elapsedPercent", () => {
  it("measures the school year from 1 September to the exam", () => {
    expect(elapsedPercent("2027-06-01", at(2026, 9, 1))).toBe(0);
    expect(elapsedPercent("2027-06-01", at(2027, 6, 1))).toBe(100);
    expect(elapsedPercent("2027-06-01", at(2027, 6, 5))).toBe(100);
    // Before the school year starts, nothing is expected yet.
    expect(elapsedPercent("2027-06-01", at(2026, 3, 1))).toBe(0);
    // 1 Sep 2026 → 1 Jun 2027 is 273 days; 1 Jan 2027 is day 122.
    expect(elapsedPercent("2027-06-01", at(2027, 1, 1))).toBeCloseTo((122 / 273) * 100, 5);
  });

  it("an exam on 1 September is due at once", () => {
    expect(elapsedPercent("2027-09-01", at(2027, 8, 1))).toBe(100);
  });
});

describe("pace", () => {
  // 1 Sep 2026 → 1 Jun 2027 (physics p1) is 273 days; 1 Jan is 44.7% through.
  const newYear = at(2027, 1, 1);

  it("is on track within 10 points of the elapsed share of the year", () => {
    const result = pace(physics({ topics: topics(10, 4) }), newYear, DATES);
    expect(result).toMatchObject({ topicsLeft: 6, weeksLeft: 22, perWeek: 1, status: "on-track" });
    expect(result.exam).toMatchObject({ paperId: "p1", date: "2027-06-01" });
  });

  it("is ahead or behind beyond the 10-point margin", () => {
    expect(pace(physics({ topics: topics(10, 6) }), newYear, DATES).status).toBe("ahead");
    expect(pace(physics({ topics: topics(10, 3) }), newYear, DATES).status).toBe("behind");
  });

  it("paces against the next exam, not one already sat", () => {
    // Maths p1 (14 May) is past; p2 (27 May) is the deadline now.
    const result = pace(maths({ topics: topics(10, 8) }), at(2027, 5, 20), DATES);
    expect(result.exam.paperId).toBe("p2");
    expect(result).toMatchObject({ topicsLeft: 2, weeksLeft: 1, perWeek: 2 });
  });

  it("is null once every exam is past", () => {
    expect(pace(maths(), at(2027, 6, 15), DATES)).toBeNull();
  });

  it("needs nothing more per week when every topic is done", () => {
    expect(pace(physics({ topics: topics(5, 5) }), newYear, DATES)).toMatchObject({
      topicsLeft: 0,
      perWeek: 0,
      status: "ahead",
    });
  });

  it("puts everything left into the final week and the exam day", () => {
    expect(pace(physics({ topics: topics(10, 5) }), at(2027, 6, 1, 8), DATES)).toMatchObject({
      weeksLeft: 0,
      perWeek: 5,
      status: "behind",
    });
  });

  it("ignores higher-only topics on the Foundation tier", () => {
    const subject = maths({
      tier: "foundation",
      topics: [
        ...topics(4, 2),
        ...topics(6, 0, { higherOnly: true }).map((t) => ({ ...t, id: `h${t.id}` })),
      ],
    });
    // 2 of 4 in-tier topics done (50%) on 1 Jan against 14 May: 122/255 ≈ 48%.
    expect(pace(subject, newYear, DATES)).toMatchObject({ topicsLeft: 2, status: "on-track" });
    // On Higher the same subject has 8 of 10 left (20% done): behind.
    expect(pace({ ...subject, tier: "higher" }, newYear, DATES)).toMatchObject({
      topicsLeft: 8,
      status: "behind",
    });
  });

  it("is null for a subject with no topics in its tier", () => {
    expect(pace(physics({ topics: [] }), newYear, DATES)).toBeNull();
  });
});

describe("local calendar days in Europe/London", () => {
  // Node re-reads TZ when it changes, so Date's local time becomes London's.
  const { env } = globalThis.process;
  let previous;
  beforeAll(() => {
    previous = env.TZ;
    env.TZ = "Europe/London";
  });
  afterAll(() => {
    if (previous === undefined) delete env.TZ;
    else env.TZ = previous;
  });

  it("switches days at London midnight, not UTC midnight (BST)", () => {
    // 23:30 UTC on 13 May is 00:30 on 14 May in London: exam day.
    const justAfterMidnight = new Date("2027-05-13T23:30:00Z");
    expect(nextExam([maths()], justAfterMidnight, DATES)).toMatchObject({ paperId: "p1", days: 0 });
    expect(weeksLeft("2027-05-14", justAfterMidnight)).toBe(0);

    // 22:59 UTC on 14 May is 23:59 in London: still exam day.
    expect(nextExam([maths()], new Date("2027-05-14T22:59:00Z"), DATES)).toMatchObject({ paperId: "p1" });

    // 23:00 UTC on 14 May is midnight on 15 May in London: paper 1 has gone.
    expect(nextExam([maths()], new Date("2027-05-14T23:00:00Z"), DATES)).toMatchObject({ paperId: "p2", days: 12 });
  });

  it("keeps weeks whole across the clocks going forward (28 March 2027)", () => {
    // 23:30 UTC on 27 March is still 27 March in London (BST starts 01:00 UTC
    // on the 28th). The week lost an hour, but 3 April is still exactly 7 days.
    const lateSaturday = new Date("2027-03-27T23:30:00Z");
    expect(weeksLeft("2027-04-03", lateSaturday)).toBe(1);
    expect(weeksLeft("2027-04-04", lateSaturday)).toBe(2);
  });
});

describe("published timetable file", () => {
  it("holds real dates in summer 2027 for catalogue papers", async () => {
    const { loadSpec } = await import("./catalogue.js");
    for (const [specId, papers] of Object.entries(PUBLISHED)) {
      const spec = await loadSpec(specId);
      expect(spec, specId).toBeTruthy();
      const paperIds = new Set(spec.papers.map((paper) => paper.id));
      for (const [paperId, date] of Object.entries(papers)) {
        expect(paperIds.has(paperId), `${specId}/${paperId}`).toBe(true);
        expect(isIsoDate(date) && date >= "2027-05-01" && date <= "2027-06-30", `${specId}/${paperId} ${date}`).toBe(true);
      }
    }
  });
});

describe("normalizeSubjects keeps exam dates", () => {
  it("keeps a valid paper examDate and drops an invalid one", () => {
    const [subject] = normalizeSubjects([
      maths({
        papers: [
          { id: "p1", name: "Paper 1", examDate: "2027-05-20" },
          { id: "p2", name: "Paper 2", examDate: "soon" },
          { id: "p3", name: "Paper 3" },
        ],
      }),
    ]);
    expect(subject.papers).toEqual([
      { id: "p1", name: "Paper 1", examDate: "2027-05-20" },
      { id: "p2", name: "Paper 2" },
      { id: "p3", name: "Paper 3" },
    ]);
    expect(normalizeSubjects([subject])).toEqual([subject]);
  });
});
