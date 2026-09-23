import { describe, expect, it } from "vitest";
import { validateSpec } from "../../src/utils/catalogue.js";
import {
  buildDraftSpec,
  isBoilerplate,
  leafHeadings,
  numberedHeadings,
  paperCandidates,
  stackedHeadings,
} from "./specDraft.js";

// Line shapes copied from real spec PDFs (headings only).
const AQA_CONTENTS = [
  "1.1 Why choose AQA for GCSE Combined Science 5",
  "4.1 Cell biology 20",
  "4.2 Organisation 26",
  "4.8 Key ideas 65",
  "5.10 Using resources 115",
  "8.1 Entries and codes 170",
  "4.1 Cell biology",
  "4.1.1 Cell structure",
  "Biology Paper 1",
  "Chemistry Paper 2",
];

const OCR_TABLE = [
  "Computer systems (Component 01)",
  "1.1 The characteristics of contemporary processors, input, output and storage devices",
  "1.1.1 Structure and function of the processor (a) The Arithmetic and Logic Unit; ALU, Control Unit",
  "1.1.2 Types of processor (a) The differences between and uses of CISC and RISC",
  "Algorithms and programming (Component 02)",
  "2.1.1 Thinking abstractly (a) The nature of abstraction.",
];

const PEARSON_STACKED = [
  "Paper 1: Pure Mathematics 1 (*Paper code: 9MA0/01)",
  "Paper 3: Statistics and Mechanics, Section 2.2 – Paragraphs reordered",
  "1",
  "Proof",
  "1.1 Understand and use the structure of mathematical proof",
  "7",
  "Differentiation",
  "7.1 Understand and use the derivative",
  "7",
  "Differentiation",
  "continued",
  "7.4 Differentiate using the product rule",
  "3",
  "Coordinate geometry in the",
  "(x, y) plane",
  "3.1 Understand and use the equation of a straight line",
];

describe("numberedHeadings", () => {
  it("reads headings at the chosen depth, strips contents-page numbers and drops boilerplate", () => {
    expect(numberedHeadings(AQA_CONTENTS)).toEqual([
      { number: "4.1", name: "Cell biology" },
      { number: "4.2", name: "Organisation" },
      { number: "5.10", name: "Using resources" },
    ]);
    expect(numberedHeadings(AQA_CONTENTS, { depth: 3 })).toEqual([
      { number: "4.1.1", name: "Cell structure" },
    ]);
  });

  it("cuts the (a) content that shares a line with the heading", () => {
    expect(numberedHeadings(OCR_TABLE, { depth: 3 }).map((h) => h.name)).toEqual([
      "Structure and function of the processor",
      "Types of processor",
      "Thinking abstractly",
    ]);
  });

  it("does not mistake years, page refs or prose for headings", () => {
    expect(
      numberedHeadings(["2017 onwards", "12 Visit aqa.org.uk", "3.1 ....... 12", "3.2 lowercase start"])
    ).toEqual([]);
  });
});

describe("leafHeadings", () => {
  it("keeps the deepest heading on each branch of a mixed-depth spec", () => {
    const lines = [
      "3.1 Number",
      "3.1.1 Structure and calculation",
      "3.1.2 Fractions, decimals and percentages",
      "3.3 Ratio, proportion and rates of change",
      "3.4 Geometry and measures",
      "3.4.3 Vectors",
    ];
    expect(leafHeadings(lines).map((h) => h.number)).toEqual(["3.1.1", "3.1.2", "3.3", "3.4.3"]);
  });
});

describe("stackedHeadings", () => {
  it("joins wrapped titles and skips 'continued' repeats", () => {
    expect(stackedHeadings(PEARSON_STACKED)).toEqual([
      { number: "1", name: "Proof" },
      { number: "7", name: "Differentiation" },
      { number: "3", name: "Coordinate geometry in the (x, y) plane" },
    ]);
  });
});

describe("paperCandidates", () => {
  it("finds Paper N:, (Component NN) and '<Science> Paper N' forms, first mention wins", () => {
    expect(paperCandidates(PEARSON_STACKED)).toEqual([
      { id: "p1", name: "Pure Mathematics 1" },
      { id: "p3", name: "Statistics and Mechanics" },
    ]);
    expect(paperCandidates(OCR_TABLE)).toEqual([
      { id: "p1", name: "Computer systems" },
      { id: "p2", name: "Algorithms and programming" },
    ]);
    expect(paperCandidates(AQA_CONTENTS)).toEqual([
      { id: "b1", name: "Biology Paper 1" },
      { id: "c2", name: "Chemistry Paper 2" },
    ]);
    expect(paperCandidates(["Paper 3A: Further Pure Mathematics 1"])).toEqual([
      { id: "p3a", name: "Further Pure Mathematics 1" },
    ]);
  });
});

describe("isBoilerplate", () => {
  it("flags administrative sections but not topics", () => {
    ["Why choose AQA for GCSE Maths", "Assessment objectives", "Key ideas", "Entries and codes"].forEach(
      (name) => expect(isBoilerplate(name)).toBe(true)
    );
    ["Cell biology", "Key concepts in physics", "Assessing risk"].forEach((name) =>
      expect(isBoilerplate(name)).toBe(false)
    );
  });
});

describe("buildDraftSpec", () => {
  const meta = { board: "AQA", spec: "8464", qualification: "gcse", subject: "Combined Science", tiered: true };

  it("builds a catalogue-shaped draft with TODOs where a human must decide", () => {
    const draft = buildDraftSpec(AQA_CONTENTS, meta, { sections: ["4", "5"] });
    expect(draft).toMatchObject({
      id: "aqa-8464",
      board: "AQA",
      spec: "8464",
      qualification: "gcse",
      tiers: ["foundation", "higher"],
      firstExam: null,
      specVersion: "TODO",
      optionGroups: [],
      milestones: [],
    });
    expect(draft.topics).toEqual([
      { id: "aqa-8464-t01", name: "Cell biology", paper: "TODO", higherOnly: false, _source: "4.1" },
      { id: "aqa-8464-t02", name: "Organisation", paper: "TODO", higherOnly: false, _source: "4.2" },
      { id: "aqa-8464-t03", name: "Using resources", paper: "TODO", higherOnly: false, _source: "5.10" },
    ]);
  });

  it("never passes validateSpec until a human finishes it", () => {
    const draft = buildDraftSpec(AQA_CONTENTS, meta);
    const errors = validateSpec(draft, "aqa-8464.json");
    expect(errors.join("\n")).toMatch(/firstExam/);
    expect(errors.join("\n")).toMatch(/unknown paper TODO/);
  });

  it("only tiers GCSE drafts that ask for it", () => {
    expect(buildDraftSpec([], { ...meta, tiered: false }).tiers).toBeNull();
    expect(buildDraftSpec([], { ...meta, qualification: "alevel" }).tiers).toBeNull();
  });
});
