import { describe, expect, it } from "vitest";
import {
  addTombstone,
  childKey,
  deletedAt,
  emptyTombstones,
  mergeTombstones,
  normalizeTombstones,
} from "./tombstones.js";

const T1 = "2026-10-05T09:00:00.000Z";
const T2 = "2026-10-06T09:00:00.000Z";

describe("tombstones", () => {
  it("record a deletion without mutating the input", () => {
    const before = emptyTombstones();
    const after = addTombstone(before, "sessions", "sess-1", T1);
    expect(deletedAt(after, "sessions", "sess-1")).toBe(T1);
    expect(deletedAt(before, "sessions", "sess-1")).toBeNull();
  });

  it("key topics and milestones by their subject", () => {
    expect(childKey("physics", "ph0")).toBe("physics::ph0");
  });

  it("normalize untrusted input down to id -> timestamp pairs", () => {
    expect(normalizeTombstones(null)).toEqual(emptyTombstones());
    expect(normalizeTombstones("nope")).toEqual(emptyTombstones());
    expect(
      normalizeTombstones({
        sessions: { good: T1, bad: "yesterday", worse: 5 },
        topics: ["not", "an", "object"],
        // A kind this build doesn't know is a newer build's deletes: kept (N9).
        unknown: { x: T1, bad: "yesterday" },
        notAMap: [T1],
      })
    ).toEqual({ ...emptyTombstones(), sessions: { good: T1 }, unknown: { x: T1 } });
  });

  it("cannot be used to pollute Object.prototype", () => {
    const hostile = JSON.parse(`{"sessions":{"__proto__":"${T1}","constructor":"${T1}"}}`);
    const result = normalizeTombstones(hostile);
    expect({}.polluted).toBeUndefined();
    expect(Object.getPrototypeOf(result.sessions)).toBe(Object.prototype);
    expect(deletedAt(emptyTombstones(), "sessions", "constructor")).toBeNull();
    expect(deletedAt(emptyTombstones(), "sessions", "__proto__")).toBeNull();
  });

  it("merge by keeping the later deletion, whichever side it is on", () => {
    const a = { ...emptyTombstones(), sessions: { x: T1, onlyA: T1 } };
    const b = { ...emptyTombstones(), sessions: { x: T2, onlyB: T2 } };
    const expected = { ...emptyTombstones(), sessions: { onlyA: T1, onlyB: T2, x: T2 } };
    expect(mergeTombstones(a, b)).toEqual(expected);
    expect(mergeTombstones(b, a)).toEqual(expected);
  });
});
