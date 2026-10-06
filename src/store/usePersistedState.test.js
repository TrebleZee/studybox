import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { loadJson, saveJson, STORAGE_KEYS } from "./localStore.js";
import { runMigrations, storedSchemaIsNewer } from "./migrations.js";
import usePersistedState from "./usePersistedState.js";

// N9: when the stored data was written by a newer build (sb-schema above this
// build's SCHEMA_VERSION), the mount write-back is skipped, so a key this
// build has not changed is never rewritten in this build's shape.

const KEY = STORAGE_KEYS.subjects;
const stored = () => localStorage.getItem(KEY);
const load = () => loadJson(KEY, []).map((item) => ({ id: item.id, name: item.name || "Untitled" }));

describe("usePersistedState and a newer stored schema (N9)", () => {
  it("rewrites a key on mount at the current schema, as before", () => {
    saveJson(KEY, [{ id: "a" }]);
    runMigrations();
    expect(storedSchemaIsNewer()).toBe(false);
    renderHook(() => usePersistedState(KEY, load));
    expect(stored()).toBe(JSON.stringify([{ id: "a", name: "Untitled" }]));
  });

  it("leaves the stored text alone on mount when a newer build wrote it", () => {
    localStorage.setItem(KEY, '{"not":"what this build expects"}');
    saveJson(STORAGE_KEYS.schema, 99);
    expect(runMigrations().newer).toBe(true);
    expect(storedSchemaIsNewer()).toBe(true);

    renderHook(() => usePersistedState(KEY, () => [{ id: "a", name: "Untitled" }]));
    expect(stored()).toBe('{"not":"what this build expects"}');
  });

  it("still writes the user's own change, and after that the key as this build holds it", () => {
    saveJson(KEY, [{ id: "a", order: 1 }]);
    saveJson(STORAGE_KEYS.schema, 99);
    runMigrations();

    const { result } = renderHook(() => usePersistedState(KEY, () => loadJson(KEY, [])));
    expect(stored()).toBe(JSON.stringify([{ id: "a", order: 1 }]));
    act(() => result.current[1]((list) => [...list, { id: "b" }]));
    expect(loadJson(KEY, null)).toEqual([{ id: "a", order: 1 }, { id: "b" }]);
  });

  it("goes back to rewriting once the schema is this build's again", () => {
    saveJson(STORAGE_KEYS.schema, 99);
    runMigrations();
    expect(storedSchemaIsNewer()).toBe(true);
    localStorage.clear();
    runMigrations();
    expect(storedSchemaIsNewer()).toBe(false);
  });
});

// N10: a placeholder value (the onboarding defaults) is never written, and a
// stored value is removed when the state goes back to the placeholder.
describe("usePersistedState with a placeholder", () => {
  const isPlaceholder = (value) => value.length === 0;

  it("doesn't write the placeholder on mount", () => {
    renderHook(() => usePersistedState(KEY, () => [], undefined, isPlaceholder));
    expect(stored()).toBeNull();
  });

  it("writes real data, and removes the key when the state goes back to the placeholder", () => {
    const { result } = renderHook(() => usePersistedState(KEY, () => [], undefined, isPlaceholder));
    act(() => result.current[1]([{ id: "a" }]));
    expect(stored()).toBe(JSON.stringify([{ id: "a" }]));
    act(() => result.current[1]([]));
    expect(stored()).toBeNull();
  });
});
