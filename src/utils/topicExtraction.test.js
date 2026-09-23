import { describe, expect, it } from "vitest";
import { cleanTopicName, inferTopicChecklist, topicReadings } from "./topicExtraction.js";

// Excerpts shaped like the boards' real spec PDFs, one visual row per line as
// src/utils/pdfLines.js extracts them.
const lines = (...rows) => rows.join("\n");

describe("inferTopicChecklist on board layouts", () => {
  it("reads AQA numbered headings, skipping admin chapters and page numbers", () => {
    const text = lines(
      "Contents",
      "1 Introduction 5",
      "1.1 Why choose AQA for A-level Physics 5",
      "1.2 Support and resources to help you teach 6",
      "3 Subject content 11",
      "3.1 Measurements and their errors 11",
      "3.2 Particles and radiation 14",
      "3.3 Waves 18",
      "3.4 Mechanics and materials 21",
      "3.5 Electricity 26",
      "3.6 Further mechanics and thermal physics (A-level only) 29",
      "4 Scheme of assessment 70",
      "4.1 Aims 70",
      "4.2 Assessment objectives 71",
      "5 General administration 74",
      "5.1 Entries and codes 74",
      "5.2 Overlaps with other qualifications 74",
      "3.1 Measurements and their errors",
      "Content in this section is a continuation of that found in GCSE.",
      "3.2 Particles and radiation"
    );
    expect(inferTopicChecklist(text)).toEqual([
      "Measurements and their errors",
      "Particles and radiation",
      "Waves",
      "Mechanics and materials",
      "Electricity",
      "Further mechanics and thermal physics",
    ]);
  });

  it("keeps leaf headings when depths are mixed (AQA GCSE Maths)", () => {
    const text = lines(
      "3.1 Number",
      "3.1.1 Structure and calculation",
      "3.1.2 Fractions, decimals and percentages",
      "3.1.3 Measures and accuracy",
      "3.2 Algebra",
      "3.2.1 Notation, vocabulary and manipulation",
      "3.2.2 Graphs",
      "3.3 Ratio, proportion and rates of change",
      "3.4 Probability"
    );
    expect(inferTopicChecklist(text)).toEqual([
      "Structure and calculation",
      "Fractions, decimals and percentages",
      "Measures and accuracy",
      "Notation, vocabulary and manipulation",
      "Graphs",
      "Ratio, proportion and rates of change",
      "Probability",
    ]);
  });

  it("reads Edexcel's 'Topic N – name' lists, several to a line and wrapped", () => {
    const text = lines(
      "Content overview",
      "Topic 1 – Key concepts in biology, Topic 2 – Cells and control, Topic 3 – Genetics, Topic 4",
      "– Natural selection and genetic modification, Topic 5 – Health, disease and the",
      "development of medicines",
      "Topic 1 – Key concepts in biology",
      "Students should: Maths skills",
      "1.1 Explain how the sub-cellular structures of eukaryotic and prokaryotic cells are related",
      "1.2 Describe how specialised cells are adapted to their function",
      "Topic 2 – Cells and control"
    );
    expect(inferTopicChecklist(text)).toEqual([
      "Key concepts in biology",
      "Cells and control",
      "Genetics",
      "Natural selection and genetic modification",
      "Health, disease and the development of medicines",
    ]);
  });

  it("reads history option codes, dropping level notes and page references", () => {
    const text = lines(
      "Component 1: Breadth study",
      "1A The Age of the Crusades, c1071–1204 (page 17)",
      "1B Spain in the Age of Discovery, 1469–1598 (A-level only) (page 19)",
      "1C The Tudors: England, 1485–1603 (page 20)",
      "1D Stuart Britain and the Crisis of Monarchy, 1603–1702 (page 21)",
      "1E Russia in the Age of Absolutism and Enlightenment,",
      "1682–1796 (A-level only) 23"
    );
    expect(inferTopicChecklist(text)).toEqual([
      "The Age of the Crusades, c1071–1204",
      "Spain in the Age of Discovery, 1469–1598",
      "The Tudors: England, 1485–1603",
      "Stuart Britain and the Crisis of Monarchy, 1603–1702",
      "Russia in the Age of Absolutism and Enlightenment, 1682–1796",
    ]);
  });

  it("reads unnumbered headings above Edexcel's 'What students need to learn'", () => {
    const text = lines(
      "1. Number",
      "Structure and calculation",
      "What students need to learn:",
      "N1 order positive and negative integers",
      "Fractions, decimals and percentages",
      "What students need to learn:",
      "Measures and accuracy",
      "What students need to learn:",
      "3. Ratio, proportion and rates of change",
      "What students need to learn:",
      "5. Probability",
      "What students need to learn:"
    );
    expect(inferTopicChecklist(text)).toEqual([
      "Structure and calculation",
      "Fractions, decimals and percentages",
      "Measures and accuracy",
      "Ratio, proportion and rates of change",
      "Probability",
    ]);
  });

  it("cuts OCR's second-column learning outcomes off the heading", () => {
    const text = lines(
      "1.1.1 Structure and function of the processor (a) The Arithmetic and Logic Unit; ALU, Control Unit",
      "1.1.2 Types of processor (a) The differences between and uses of CISC and RISC",
      "1.1.3 Input, output and storage (a) How different input, output and storage devices can",
      "1.2.1 Systems Software (a) The need for, function and purpose of operating systems.",
      "1.2.2 Applications Generation (a) The nature of applications"
    );
    expect(inferTopicChecklist(text)).toEqual([
      "Structure and function of the processor",
      "Types of processor",
      "Input, output and storage",
      "Systems Software",
      "Applications Generation",
    ]);
  });

  it("ignores the maths notation appendix and running footers", () => {
    const content = [
      "Proof",
      "Algebra and functions",
      "Coordinate geometry",
      "Sequences and series",
      "Trigonometry",
      "Exponentials and logarithms",
    ].map((name, i) => `2.${i + 1} ${name}`);
    const notation = [
      "Set notation",
      "Miscellaneous symbols",
      "Operations",
      "Functions",
      "Exponential and logarithmic functions",
      "Vectors",
    ].map((name, i) => `6.${i + 1} ${name}`);
    const footers = [10, 11, 12, 13].map((page) => `${page}. Cambridge OCR Level 3 Advanced GCE in Mathematics A`);
    expect(inferTopicChecklist(lines(...content, ...footers, ...notation))).toEqual([
      "Proof",
      "Algebra and functions",
      "Coordinate geometry",
      "Sequences and series",
      "Trigonometry",
      "Exponentials and logarithms",
    ]);
  });

  it("prefers the reading nearest a usable checklist size", () => {
    // Four coarse themes vs twelve numbered topics under them.
    const themes = ["Marketing and people", "Managing business activities", "Business decisions", "Global business"];
    const topics = [
      ["Meeting customer needs", "The market", "Managing people"],
      ["Raising finance", "Financial planning", "Resource management"],
      ["Business growth", "Decision-making techniques", "Managing change"],
      ["Globalisation", "Global markets", "Global marketing"],
    ];
    const text = lines(
      ...themes.map((name, i) => `Theme ${i + 1}: ${name}`),
      ...topics.flatMap((names, t) => names.map((name, i) => `${t + 1}.${i + 1} ${name}`))
    );
    const [best] = topicReadings(text);
    expect(best.family).toBe("numbered");
  });

  it("returns an empty list for empty or topic-free text", () => {
    expect(inferTopicChecklist("")).toEqual([]);
    expect(inferTopicChecklist("A specification for teaching Art History.\nVisit aqa.org.uk")).toEqual([]);
  });
});

describe("cleanTopicName", () => {
  it.each([
    ["Number 10", "Number"],
    ["Measures and accuracy ........ 12", "Measures and accuracy"],
    ["Social influence (page 13)", "Social influence"],
    ["Genetics, populations, evolution and ecosystems (A- level only)", "Genetics, populations, evolution and ecosystems"],
    ["Complex numbers (Further Maths only)", "Complex numbers"],
    ["Coordinate geometry in the ( x, y ) plane", "Coordinate geometry in the (x, y) plane"],
    ["A: Proof", "Proof"],
    ["Russia in the Age of Absolutism and Enlightenment, 1682–1796 (A-level", "Russia in the Age of Absolutism and Enlightenment, 1682–1796"],
  ])("cleans %j", (raw, expected) => {
    expect(cleanTopicName(raw)).toBe(expected);
  });
});
