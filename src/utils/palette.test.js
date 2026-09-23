import { describe, expect, it } from "vitest";
import { SUBJECT_PALETTE, pickColor, pickColors } from "./palette.js";

describe("pickColors", () => {
  it("starts at the top of the palette when nothing is used", () => {
    expect(pickColor([])).toBe(SUBJECT_PALETTE[0]);
    expect(pickColors([], 3)).toEqual(SUBJECT_PALETTE.slice(0, 3));
  });

  it("skips colours already in use, case-insensitively", () => {
    const used = [SUBJECT_PALETTE[0].toLowerCase(), SUBJECT_PALETTE[2]];
    expect(pickColors(used, 2)).toEqual([SUBJECT_PALETTE[1], SUBJECT_PALETTE[3]]);
  });

  it("gives every new subject a distinct colour while the palette lasts", () => {
    const picked = pickColors(["#123456"], SUBJECT_PALETTE.length);
    expect(new Set(picked).size).toBe(SUBJECT_PALETTE.length);
  });

  it("cycles through the least-used colours once the palette runs out", () => {
    const picked = pickColors(SUBJECT_PALETTE, 2);
    expect(picked).toEqual([SUBJECT_PALETTE[0], SUBJECT_PALETTE[1]]);
  });
});
