import { describe, expect, it } from "vitest";
import { isTimestamp, keepStamps, newId, stampNew, touch, uuid } from "./records.js";
import { normalizeSessions, normalizeSubject } from "./subjects.js";

const T1 = "2026-10-05T09:00:00.000Z";
const T2 = "2026-10-06T09:00:00.000Z";

describe("record ids", () => {
  it("are prefixed UUIDs that don't collide", () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId("sess")));
    expect(ids.size).toBe(500);
    expect([...ids][0]).toMatch(/^sess-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("still produces a v4 UUID where crypto.randomUUID is missing", () => {
    const original = globalThis.crypto.randomUUID;
    try {
      Object.defineProperty(globalThis.crypto, "randomUUID", { value: undefined, configurable: true, writable: true });
      expect(uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      Object.defineProperty(globalThis.crypto, "randomUUID", { value: original, configurable: true, writable: true });
    }
  });
});

describe("record stamps", () => {
  it("stampNew sets both stamps and touch only moves updatedAt", () => {
    const created = stampNew({ id: "a" }, T1);
    expect(created).toEqual({ id: "a", createdAt: T1, updatedAt: T1 });
    expect(touch(created, T2)).toEqual({ id: "a", createdAt: T1, updatedAt: T2 });
  });

  it("only accepts real ISO UTC timestamps", () => {
    expect(isTimestamp(T1)).toBe(true);
    ["2026-10-05", "yesterday", 12345, null, "2026-13-45T99:00:00.000Z", "2026-10-05T09:00:00+01:00"].forEach(
      (value) => expect(isTimestamp(value), String(value)).toBe(false)
    );
    expect(keepStamps({ createdAt: "junk", updatedAt: T1 })).toEqual({ updatedAt: T1 });
  });
});

describe("normalizers and stamps", () => {
  it("leave pre-v3 records without stamps, exactly as before", () => {
    const subject = normalizeSubject({ id: "s", name: "S", topics: [{ id: "t", name: "T" }] });
    expect(subject).not.toHaveProperty("updatedAt");
    expect(subject.topics[0]).not.toHaveProperty("updatedAt");
    expect(normalizeSessions([{ id: "x", duration: 60, date: T1 }])[0]).not.toHaveProperty("updatedAt");
  });

  it("carry stamps through on subjects, topics, milestones and sessions", () => {
    const subject = normalizeSubject({
      id: "s",
      name: "S",
      createdAt: T1,
      updatedAt: T2,
      topics: [{ id: "t", name: "T", createdAt: T1, updatedAt: T2 }],
      milestones: [{ id: "m", name: "M", kind: "nea", createdAt: T1, updatedAt: "not a date" }],
    });
    expect(subject).toMatchObject({ createdAt: T1, updatedAt: T2 });
    expect(subject.topics[0]).toMatchObject({ createdAt: T1, updatedAt: T2 });
    expect(subject.milestones[0].createdAt).toBe(T1);
    expect(subject.milestones[0]).not.toHaveProperty("updatedAt");
    expect(normalizeSessions([{ id: "x", duration: 60, date: T1, createdAt: T1, updatedAt: T2 }])[0]).toMatchObject({
      createdAt: T1,
      updatedAt: T2,
    });
  });

  it("is idempotent with stamps present", () => {
    const once = normalizeSubject({ id: "s", name: "S", updatedAt: T2, topics: [{ id: "t", name: "T", updatedAt: T1 }] });
    expect(normalizeSubject(once)).toEqual(once);
  });
});
