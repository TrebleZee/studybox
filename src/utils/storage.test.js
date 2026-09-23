import { describe, expect, it } from "vitest";
import { STORAGE_KEYS, loadJson } from "./storage.js";
import { normalizeSessions, normalizeSubjects, defaultSubjects } from "./subjects.js";
import { buildInitialGame } from "./gameLogic.js";

describe("loadJson", () => {
  it("returns the fallback for missing keys", () => {
    expect(loadJson("missing", "fallback")).toBe("fallback");
  });

  it("parses stored JSON", () => {
    localStorage.setItem("k", JSON.stringify({ a: 1 }));
    expect(loadJson("k", null)).toEqual({ a: 1 });
  });

  it("returns the fallback for corrupted JSON instead of throwing", () => {
    localStorage.setItem("k", "{not json");
    expect(loadJson("k", 42)).toBe(42);
  });
});

describe("loading corrupted app state", () => {
  it("degrades to sane defaults for every stored key", () => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.setItem(key, "{{{"));

    const subjects = normalizeSubjects(loadJson(STORAGE_KEYS.subjects, null));
    const sessions = normalizeSessions(loadJson(STORAGE_KEYS.sessions, []));
    const game = buildInitialGame(loadJson(STORAGE_KEYS.game, null), sessions, subjects);

    expect(subjects).toEqual(normalizeSubjects(defaultSubjects()));
    expect(sessions).toEqual([]);
    expect(game.currentStreak).toBe(0);
  });

  it("copes with wrong-typed but valid JSON", () => {
    localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify({ oops: true }));
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify("nope"));
    localStorage.setItem(STORAGE_KEYS.game, JSON.stringify([1, 2]));

    expect(() => {
      const subjects = normalizeSubjects(loadJson(STORAGE_KEYS.subjects, null));
      const sessions = normalizeSessions(loadJson(STORAGE_KEYS.sessions, []));
      buildInitialGame(loadJson(STORAGE_KEYS.game, null), sessions, subjects);
    }).not.toThrow();
  });
});
