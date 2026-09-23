import { describe, expect, it } from "vitest";
import { backupFileName, buildBackup, parseBackup } from "./backup.js";
import { DEFAULT_GAME } from "./gameLogic.js";
import { defaultSubjects, normalizeSessions, normalizeSubjects } from "./subjects.js";

const sampleState = () => {
  const subjects = normalizeSubjects(defaultSubjects());
  subjects[0].topics[0].done = true;
  return {
    subjects,
    sessions: normalizeSessions([
      {
        id: "s1",
        subjectId: "physics",
        subjectName: "Physics",
        subjectColor: "#4F9CF9",
        duration: 1800,
        date: "2026-06-19T09:00:00.000Z",
        note: "n",
        tags: ["Recap"],
      },
    ]),
    themeId: "forest",
    game: { ...DEFAULT_GAME, currentStreak: 4, longestStreak: 9, lastStudyDate: "2026-06-19", totalXP: 740 },
  };
};

describe("backup", () => {
  it("builds valid JSON containing subjects, sessions, theme, game and a version", () => {
    const state = sampleState();
    const parsed = JSON.parse(JSON.stringify(buildBackup(state)));
    expect(Object.keys(parsed).sort()).toEqual(["game", "sessions", "subjects", "theme", "version"]);
    expect(parsed.theme).toBe("forest");
    expect(parsed.version).toBe(2);
  });

  it("round-trips through export and import to identical state", () => {
    const state = sampleState();
    const restored = parseBackup(JSON.stringify(buildBackup(state), null, 2));
    expect(restored.subjects).toEqual(state.subjects);
    expect(restored.sessions).toEqual(state.sessions);
    expect(restored.themeId).toBe(state.themeId);
    expect(restored.game).toEqual(state.game);
  });

  it("loads a v1 backup, migrating subjects without losing progress", () => {
    const v1 = {
      version: 1,
      theme: "forest",
      sessions: [],
      subjects: [
        {
          id: "physics",
          name: "Physics",
          exam: "OCR A",
          color: "#4F9CF9",
          topics: [{ id: "ph0", name: "Foundations", done: true, subtasks: [] }],
        },
        { id: "custom-1", name: "Latin", exam: "My tutor", color: "#ff0000", topics: [] },
      ],
    };
    const restored = parseBackup(JSON.stringify(v1));
    expect(restored.subjects[0]).toMatchObject({ board: "OCR", spec: "H556", qualification: "alevel" });
    expect(restored.subjects[0].topics).toEqual(v1.subjects[0].topics);
    expect(restored.subjects[1]).toMatchObject({ board: "Custom", exam: "My tutor" });

    // Re-exporting the migrated data as v2 and loading it again is lossless.
    const again = parseBackup(JSON.stringify(buildBackup({ ...restored, game: DEFAULT_GAME })));
    expect(again.subjects).toEqual(restored.subjects);
  });

  it("round-trips v2 metadata such as tier and spec code", () => {
    const subjects = normalizeSubjects([
      { id: "m", name: "Maths", board: "Edexcel", qualification: "gcse", spec: "1MA1", tier: "higher" },
    ]);
    const restored = parseBackup(JSON.stringify(buildBackup({ ...sampleState(), subjects })));
    expect(restored.subjects).toEqual(subjects);
    expect(restored.subjects[0]).toMatchObject({ tier: "higher", spec: "1MA1", exam: "Edexcel" });
  });

  it("round-trips milestones, papers and topic tags", () => {
    const subjects = normalizeSubjects([
      {
        id: "cs",
        name: "Computer Science",
        board: "OCR",
        qualification: "alevel",
        spec: "H446",
        papers: [{ id: "p1", name: "Computer systems" }],
        topics: [{ id: "t", name: "Networks", paper: "p1" }],
        milestones: [
          { id: "m1", name: "Programming project (NEA)", kind: "nea", due: "2027-03-31", done: false, catalogueMilestoneId: "ocr-h446-m01" },
          { id: "m2", name: "Analysis write-up", kind: "coursework", due: null, done: true },
        ],
      },
    ]);
    const restored = parseBackup(JSON.stringify(buildBackup({ ...sampleState(), subjects })));
    expect(restored.subjects).toEqual(subjects);
    expect(restored.subjects[0].milestones).toHaveLength(2);
    expect(restored.subjects[0].milestones[0]).toMatchObject({ due: "2027-03-31", kind: "nea", done: false });
  });

  it("refuses a backup from a newer, unknown version rather than dropping its data", () => {
    expect(() => parseBackup(JSON.stringify({ version: 99, subjects: [] }))).toThrow(/newer version/);
  });

  it("rejects malformed JSON with a visible error", () => {
    expect(() => parseBackup("{oops")).toThrow(/valid JSON/);
  });

  it("rejects JSON that isn't a StudyBox backup", () => {
    ["[]", "5", "null", '"text"', '{"hello":"world"}'].forEach((text) => {
      expect(() => parseBackup(text)).toThrow(/doesn't look like a StudyBox backup/);
    });
  });

  it("ignores unknown themes and non-object game data", () => {
    const restored = parseBackup(JSON.stringify({ subjects: [], theme: "neon", game: "x" }));
    expect(restored.subjects).toEqual([]);
    expect(restored).not.toHaveProperty("themeId");
    expect(restored).not.toHaveProperty("game");
  });

  it("names files by ISO date", () => {
    expect(backupFileName(new Date("2026-06-19T12:00:00Z"))).toBe("studybox-backup-2026-06-19.json");
  });
});
