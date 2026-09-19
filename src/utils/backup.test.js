import { describe, expect, it } from "vitest";
import { backupFileName, buildBackup, parseBackup } from "./backup.js";
import { DEFAULT_GAME } from "./gameLogic.js";
import { defaultSubjects, normalizeSessions } from "./subjects.js";

const sampleState = () => {
  const subjects = defaultSubjects();
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
    expect(parsed.version).toBe(1);
  });

  it("round-trips through export and import to identical state", () => {
    const state = sampleState();
    const restored = parseBackup(JSON.stringify(buildBackup(state), null, 2));
    expect(restored.subjects).toEqual(state.subjects);
    expect(restored.sessions).toEqual(state.sessions);
    expect(restored.themeId).toBe(state.themeId);
    expect(restored.game).toEqual(state.game);
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
