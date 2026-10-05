import { describe, expect, it } from "vitest";
import { isUntouchedDefaultSubjects } from "../utils/subjects.js";
import { addTombstone, emptyTombstones } from "../utils/tombstones.js";
import { loaders, tabMerges } from "./appState.js";
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
