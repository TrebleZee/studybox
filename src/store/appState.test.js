import { describe, expect, it } from "vitest";
import { isUntouchedDefaultSubjects } from "../utils/subjects.js";
import { addTombstone, emptyTombstones } from "../utils/tombstones.js";
import { loaders, storedBackup, tabMerges } from "./appState.js";
import { STORAGE_KEYS } from "./localStore.js";

const session = (id, updatedAt = "2026-09-13T10:00:00.000Z") => ({
  id,
  subjectId: "maths",
  subjectName: "Maths",
  subjectColor: "#4f8cff",
  duration: 600,
  date: updatedAt,
  note: "",
  tags: [],
  createdAt: updatedAt,
  updatedAt,
});

describe("tab merges", () => {
  it("keeps records only one tab has, in either order", () => {
    const { sessions } = tabMerges(emptyTombstones());
    const mine = [session("a")];
    const theirs = [session("b", "2026-09-14T10:00:00.000Z")];
    expect(sessions(mine, theirs)).toEqual(sessions(theirs, mine));
    expect(sessions(mine, theirs).map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("drops what this tab deleted even when the stored tombstones were overwritten", () => {
    localStorage.setItem(STORAGE_KEYS.tombstones, JSON.stringify(emptyTombstones()));
    const deletedHere = addTombstone(emptyTombstones(), "sessions", "a", "2026-09-14T09:00:00.000Z");
    const { sessions } = tabMerges(deletedHere);
    expect(sessions([], [session("a")])).toEqual([]);
  });

  it("drops what the other tab deleted, from the stored tombstones", () => {
    localStorage.setItem(
      STORAGE_KEYS.tombstones,
      JSON.stringify(addTombstone(emptyTombstones(), "subjects", "maths", "2026-09-14T09:00:00.000Z"))
    );
    const { subjects } = tabMerges(emptyTombstones());
    const local = loaders.subjects();
    expect(local.some((s) => s.id === "maths")).toBe(true);
    expect(subjects(local, local.filter((s) => s.id !== "maths")).some((s) => s.id === "maths")).toBe(false);
  });

  // N10: the untouched onboarding defaults are nobody's data. A tab still on
  // them takes what the other tab replaced them with, rather than adding them back.
  it("takes the other tab's subjects while this tab only has the untouched defaults", () => {
    const { subjects } = tabMerges(emptyTombstones());
    const defaults = loaders.subjects();
    expect(isUntouchedDefaultSubjects(defaults)).toBe(true);
    expect(subjects(defaults, [])).toEqual([]);
    const ticked = defaults.map((s, i) => (i ? s : { ...s, topics: [{ ...s.topics[0], done: true, updatedAt: "2026-09-14T09:00:00.000Z" }, ...s.topics.slice(1)] }));
    expect(subjects(ticked, []).map((s) => s.id)).toEqual(defaults.map((s) => s.id));
  });

  it("changes nothing when both tabs agree, so nothing is written back", () => {
    const { subjects, sessions, game } = tabMerges(emptyTombstones());
    const subjectList = loaders.subjects();
    const sessionList = [session("a")];
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessionList));
    const current = loaders.game();
    expect(subjects(subjectList, subjectList)).toEqual(subjectList);
    expect(sessions(sessionList, sessionList)).toEqual(sessionList);
    expect(game(current, current)).toEqual(current);
  });
});

describe("loaders", () => {
  it("start an untouched install on the default subjects", () => {
    expect(isUntouchedDefaultSubjects(loaders.subjects())).toBe(true);
  });
});

describe("storedBackup", () => {
  it("carries account data that doesn't parse as the text it is stored as (N16)", () => {
    localStorage.setItem(STORAGE_KEYS.subjects, '[{"id":"maths","na');
    const backup = storedBackup();
    expect(backup.unreadable).toEqual({ [STORAGE_KEYS.subjects]: '[{"id":"maths","na' });
    expect(Array.isArray(backup.subjects)).toBe(true);
  });

  it("has no unreadable field when everything parses", () => {
    expect(storedBackup()).not.toHaveProperty("unreadable");
  });
});
