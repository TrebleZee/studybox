import { describe, expect, it } from "vitest";
import { fmt, fmtDate, fmtDur } from "./format.js";

describe("fmt", () => {
  it("formats mm:ss under an hour and h:mm:ss above", () => {
    expect(fmt(0)).toBe("00:00");
    expect(fmt(65)).toBe("01:05");
    expect(fmt(3600)).toBe("1:00:00");
    expect(fmt(3725)).toBe("1:02:05");
  });
});

describe("fmtDur", () => {
  it("shows a dash for zero and compact units otherwise", () => {
    expect(fmtDur(0)).toBe("-");
    expect(fmtDur(59)).toBe("0m");
    expect(fmtDur(60)).toBe("1m");
    expect(fmtDur(3600)).toBe("1h");
    expect(fmtDur(4500)).toBe("1h 15m");
  });
});

describe("fmtDate", () => {
  it("formats as day and short month", () => {
    expect(fmtDate(new Date(2026, 5, 19, 12).toISOString())).toBe("19 Jun");
  });
});
