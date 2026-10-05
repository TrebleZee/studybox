import { describe, expect, it, vi } from "vitest";
import { loadJson, saveJson, STORAGE_KEYS } from "./localStore.js";
import { MIGRATIONS, SCHEMA_VERSION, runMigrations } from "./migrations.js";

describe("schema migrations", () => {
  it("has one step per version, ending at the current schema", () => {
    const versions = MIGRATIONS.map((step) => step.version);
    expect(versions).toEqual([...new Set(versions)].sort((a, b) => a - b));
    expect(versions[versions.length - 1]).toBe(SCHEMA_VERSION);
  });

  it("stamps an unversioned (pre-v3) install with the current version and leaves its data alone", () => {
    const subjects = [{ id: "physics", name: "Physics", topics: [{ id: "ph0", name: "Forces", done: true }] }];
    const sessions = [{ id: "sess-abc", subjectId: "physics", duration: 600, date: "2026-06-01T10:00:00.000Z" }];
    localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(subjects));
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));

    expect(runMigrations()).toEqual({ from: 2, to: SCHEMA_VERSION, newer: false, ran: [3] });
    expect(loadJson(STORAGE_KEYS.schema, null)).toBe(SCHEMA_VERSION);
    expect(loadJson(STORAGE_KEYS.subjects, null)).toEqual(subjects);
    expect(loadJson(STORAGE_KEYS.sessions, null)).toEqual(sessions);
  });

  it("runs nothing the second time", () => {
    runMigrations();
    expect(runMigrations().ran).toEqual([]);
  });

  it("runs only the steps newer than the stored version, in order", () => {
    saveJson(STORAGE_KEYS.schema, 3);
    const order = [];
    const steps = [5, 3, 4].map((version) => ({ version, up: vi.fn(() => order.push(version)) }));

    expect(runMigrations(steps, 5)).toMatchObject({ from: 3, to: 5, ran: [4, 5] });
    expect(order).toEqual([4, 5]);
    expect(loadJson(STORAGE_KEYS.schema, null)).toBe(5);
  });

  it("keeps the last finished version if a step throws, so it retries from there", () => {
    const steps = [
      { version: 3, up: () => {} },
      {
        version: 4,
        up: () => {
          throw new Error("boom");
        },
      },
    ];
    expect(() => runMigrations(steps, 4)).toThrow("boom");
    expect(loadJson(STORAGE_KEYS.schema, null)).toBe(3);
  });

  it("does not stamp a step as finished when one of its writes fails, so it retries next launch", () => {
    saveJson(STORAGE_KEYS.schema, 3);
    const oldSubjects = [{ id: "old" }];
    saveJson(STORAGE_KEYS.subjects, oldSubjects);
    const setItem = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (key, value) {
      if (key === STORAGE_KEYS.subjects) throw new DOMException("full", "QuotaExceededError");
      return setItem.call(this, key, value);
    });
    const steps = [{ version: 4, up: ({ saveJson: save, STORAGE_KEYS: keys }) => save(keys.subjects, [{ id: "new" }]) }];

    try {
      expect(() => runMigrations(steps, 4)).toThrow();
    } finally {
      spy.mockRestore();
    }
    expect(loadJson(STORAGE_KEYS.schema, null)).toBe(3);
    expect(loadJson(STORAGE_KEYS.subjects, null)).toEqual(oldSubjects);
    expect(runMigrations(steps, 4).ran).toEqual([4]);
    expect(loadJson(STORAGE_KEYS.subjects, null)).toEqual([{ id: "new" }]);
  });

  it("leaves data from a newer build alone", () => {
    saveJson(STORAGE_KEYS.schema, 99);
    expect(runMigrations()).toEqual({ from: 99, to: 99, newer: true, ran: [] });
    expect(loadJson(STORAGE_KEYS.schema, null)).toBe(99);
  });

  it("treats a corrupted version marker as unversioned", () => {
    localStorage.setItem(STORAGE_KEYS.schema, "{{{");
    expect(runMigrations().from).toBe(2);
  });
});
