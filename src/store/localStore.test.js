import { describe, expect, it } from "vitest";
import {
  KEY_SCOPES,
  SECRET_KEYS,
  STORAGE_KEYS,
  keysInScope,
  loadJson,
  loadText,
  removeKey,
  saveJson,
  saveText,
  scopeOf,
  subscribe,
} from "./localStore.js";
import { buildBackup } from "../utils/backup.js";
import { normalizeSessions, normalizeSubjects, defaultSubjects } from "../utils/subjects.js";
import { buildInitialGame } from "../utils/gameLogic.js";

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

describe("store seam", () => {
  it("classifies every key, and only the user's study data is account-scoped", () => {
    [...Object.values(STORAGE_KEYS), ...Object.values(SECRET_KEYS)].forEach((key) =>
      expect(KEY_SCOPES[key], key).toBeDefined()
    );
    expect(keysInScope("account").sort()).toEqual(
      [STORAGE_KEYS.game, STORAGE_KEYS.sessions, STORAGE_KEYS.subjects, STORAGE_KEYS.theme].sort()
    );
  });

  it("keeps the Asana token out of the app's data keys and marks it secret", () => {
    expect(Object.values(STORAGE_KEYS)).not.toContain(SECRET_KEYS.asanaToken);
    expect(scopeOf(SECRET_KEYS.asanaToken)).toBe("secret");
    expect(keysInScope("account")).not.toContain(SECRET_KEYS.asanaToken);
  });

  it("tells subscribers about every write and removal, until they unsubscribe", () => {
    const seen = [];
    const unsubscribe = subscribe((change) => seen.push(change));

    saveJson(STORAGE_KEYS.theme, "paper");
    removeKey(STORAGE_KEYS.timer);
    unsubscribe();
    saveJson(STORAGE_KEYS.theme, "midnight");

    expect(seen).toEqual([
      { key: STORAGE_KEYS.theme, scope: "account", type: "write", value: "paper" },
      { key: STORAGE_KEYS.timer, scope: "device", type: "remove", value: undefined },
    ]);
    expect(loadJson(STORAGE_KEYS.theme, null)).toBe("midnight");
  });

  it("never hands a secret's value to subscribers", () => {
    const seen = [];
    const unsubscribe = subscribe((change) => seen.push(change));
    saveText(SECRET_KEYS.asanaToken, "1/secret-token");
    unsubscribe();

    expect(loadText(SECRET_KEYS.asanaToken)).toBe("1/secret-token");
    expect(JSON.stringify(seen)).not.toContain("secret-token");
    expect(seen[0]).toMatchObject({ key: SECRET_KEYS.asanaToken, scope: "secret", value: undefined });
  });

  it("keeps saving when a subscriber throws", () => {
    const unsubscribe = subscribe(() => {
      throw new Error("listener bug");
    });
    expect(() => saveJson(STORAGE_KEYS.onboarded, true)).not.toThrow();
    unsubscribe();
    expect(loadJson(STORAGE_KEYS.onboarded, false)).toBe(true);
  });
});

describe("backups", () => {
  it("never contain the Asana token", () => {
    saveText(SECRET_KEYS.asanaToken, "1/secret-token");
    const backup = buildBackup({ subjects: [], sessions: [], themeId: "midnight", game: {} });
    expect(JSON.stringify(backup)).not.toContain("secret-token");
  });
});
