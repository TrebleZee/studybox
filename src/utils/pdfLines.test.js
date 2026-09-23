import { describe, expect, it } from "vitest";
import { pageTextToLines } from "./pdfLines.js";

// pdf.js text items: transform[4], [5] are x, y; [3] is the font size.
const item = (str, x, y, width, size = 10) => ({ str, transform: [size, 0, 0, size, x, y], width, height: size });

describe("pageTextToLines", () => {
  it("orders rows top to bottom and items left to right", () => {
    const content = { items: [item("second", 40, 600, 40), item("row", 73, 700, 20), item("First", 40, 700, 30)] };
    expect(pageTextToLines(content)).toEqual(["First row", "second"]);
  });

  it("splits a row at a column-sized gap so headings are not glued to other columns", () => {
    const content = {
      items: [
        item("topic is also introduced with a short summary text.", 40, 700, 220),
        item("2.2 Making measurements and analysing data", 300, 700, 200),
      ],
    };
    expect(pageTextToLines(content)).toEqual([
      "topic is also introduced with a short summary text.",
      "2.2 Making measurements and analysing data",
    ]);
  });

  it("keeps a section number with its title across a tab-sized gap", () => {
    const content = { items: [item("3.1", 40, 700, 14), item("Number", 80, 700, 40)] };
    expect(pageTextToLines(content)).toEqual(["3.1 Number"]);
  });

  it("skips empty items and items without text", () => {
    const content = { items: [item("", 40, 700, 0), { type: "beginMarkedContent" }, item("Text", 40, 700, 20)] };
    expect(pageTextToLines(content)).toEqual(["Text"]);
  });
});
