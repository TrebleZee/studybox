// Reads a topic checklist out of the text of an uploaded specification PDF.
//
// Boards lay their content out in a few recurring shapes, and one spec often
// uses several (a contents page, an overview table, then the content itself):
//   numbered   "3.1.2 Memory", "2.1 Physical quantities and units",
//              "1. Introduction to Microeconomics"
//   labelled   "Topic 1 – Key concepts in biology", "Unit Y101: Alfred and…",
//              "Paper 1, Option 1A: The crusades, c1095–1204",
//              "Section A: Introducing socialisation, culture and identity"
//   coded      "1A The Age of the Crusades, c1071–1204" (history options)
//   marked     an unnumbered heading straight above "What students need to
//              learn:" or "Students should be able to:"
// Each shape is collected as its own family, admin sections, learning
// statements and page numbers are dropped, and the family that looks most
// like a checklist wins. The text is expected one visual row per line, as
// src/utils/pdfLines.js builds it.

const MIN_TOPICS = 4;
const MAX_TOPICS = 80;
// Hand-made catalogue specs average about this many topics: when a spec
// could be read at several depths, the one nearest this is the most useful.
const TARGET_TOPICS = 22;
const MAX_WORDS = 14;
const MIN_CHAPTER_SHARE = 0.2;
const NOTATION = /^(?:set notation|miscellaneous symbols)$/i;

// Administrative sections every board prints; never topics.
const ADMIN = new RegExp(
  String.raw`^(?:${[
    "why choose",
    "introduction$",
    "introduction to (?:the|this|a level|as|gcse)",
    "contents",
    "overview",
    "support",
    "aims",
    "appendix",
    "appendices",
    "glossary",
    "key features",
    "qualification (?:at a glance|overview|aims)",
    "specification (?:at a glance|overview)",
    "(?:the )?specification overview",
    "subject (?:content|aims|criteria)$",
    "content overview",
    "assessments?$",
    "assessment (?:objectives?|weightings?|overview|information|of|structure|availability|requirements|criteria|guidance)",
    "scheme of assessment",
    "(?:general )?administration",
    "admin",
    "entries",
    "entry (?:codes|requirements)",
    "overlaps with",
    "awarding",
    "re-?sits",
    "previous learning",
    "prior (?:knowledge|learning)",
    "access to",
    "working with",
    "private candidates",
    "materials for use",
    "grading",
    "calculating",
    "results",
    "qualification (?:titles|and)",
    "equality",
    "accessibility",
    "prohibited",
    "use of (?:calculators|dictionaries)",
    "non-?exam assessment (?:administration|rules)",
    "(?:the )?(?:command words|mathematical requirements|mathematical skills|maths skills|units|synoptic|quality of)",
    "(?:mathematical )?notation$",
    "formulae",
    "how (?:to|is|are)",
    "what (?:is|are)",
    "teaching",
    "key ideas$",
    "learning outcomes$",
    "content$",
    "paper \\d",
    "component \\d",
    "section [a-z]\\b",
    "coursework",
    "internal (?:assessment|standardisation)",
    "moderation",
    "authentication",
    "health and safety",
    "spiritual",
    "sustainable development",
    "employability",
    "transferable skills",
    "codes? of practice",
    "copyright",
    "acknowledgements",
    "component$",
    "making entries",
    "arrangements for",
    "(?:fieldwork|investigation) requirements",
    "non-?exam assessment",
    "mark scheme",
    "specific skills$",
    "cross-curricular",
    "thinking skills",
    "using (?:mathematics|ict)$",
    "self-management$",
    "problem solving$",
    "communication$",
    "sub ?topic",
    "front cover",
    "covers?,",
    "back cover",
    "disclaimer",
    "version",
    "issue \\d",
    "changes",
    "summary of changes",
    "(?:cambridge )?ocr level",
    "pearson edexcel level",
    "aqa (?:gcse|as|a-level)",
    "specification [–-] issue",
    "visit aqa",
  ].join("|")})`,
  "i"
);

// Learning statements ("1.1 Explain how…") are numbered like headings but
// start with a command word.
const COMMAND_WORD = new RegExp(
  String.raw`^(?:${[
    "analyse", "apply", "appreciate", "be able", "be aware", "calculate", "carry out", "compare",
    "construct", "define", "demonstrate", "derive", "describe", "determine", "develop", "discuss",
    "distinguish", "draw", "estimate", "evaluate", "examine", "explain", "explore", "find", "identify",
    "illustrate", "interpret", "investigate", "justify", "know", "learners? (?:should|must|will)", "list",
    "make", "measure", "name", "outline", "plot", "predict", "prove", "recall", "recognise", "recognize",
    "select", "show", "sketch", "solve", "state", "students? (?:should|must|will)", "suggest", "understand",
    "use", "write",
  ].join("|")})\b`,
  "i"
);

// The line under an unnumbered topic heading in Edexcel and OCR content
// tables ("What students need to learn:", "Topic Students should be able to:").
const CONTENT_MARKER =
  /^(?:topic\s+)?(?:what (?:students|learners|candidates) (?:need|should|must)\b|(?:students|learners|candidates) should be able to\b)/i;

const BULLET = /^[•●▪◦■□▶►➢✓*\-–—]\s*/;
const LABELS = "Topic|Theme|Module|Unit|Chapter|Option|Section|Area of study|Content area|Key topic|Core topic";
const LABEL_NUMBER = String.raw`(?:[A-Z]?\d{1,3}[A-Z]?(?:\.\d{1,2})?|[A-H](?![a-z]))`;
// "Topic 1 – Key concepts", "Unit Y101: Alfred", "Option 1A: The crusades".
// Several can share a line (Edexcel's "Topic 1 – X, Topic 2 – Y"), so a name
// ends where the next label starts.
const LABELLED = new RegExp(
  String.raw`(?:^|[\s,;(])(${LABELS})\s+(${LABEL_NUMBER})\s*(?:[:–—.)-]\s*|\s+(?=[A-Z]))(.+?)(?=[\s,;]+(?:${LABELS})\s+${LABEL_NUMBER}\s*[:–—.)-]|$)`,
  "g"
);
const NUMBERED = /^(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(\S.*)$/;
// Chapter-level numbers need the dot ("1. Number"), since bare numbers start
// many lines (marks, footers, table cells).
const CHAPTER = /^(\d{1,2})\.\s*([A-Z].*)$/;
// History-style option codes: "1A The Age…", "1A : The crusades", "2B.1: …".
const CODED = /^(\d[A-Z](?:\.\d{1,2})?)\s*[:.–-]?\s+([A-Z(‘'"].*)$/;

// A title that stops mid-phrase carries on on the next line.
const OPEN_ENDING = /(?:\b(?:and|or|of|the|in|to|for|with|on|a|an|from)|[,:;–—-])$/i;

const cleanWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const wordsOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const cleanTopicName = (raw) => {
  let name = cleanWhitespace(raw)
    // OCR's two-column tables put the first learning outcome on the heading's
    // row: "1.1.1 Structure and function of the processor (a) The ALU…".
    .replace(/\s+\((?:a|i)\)\s.*$/, "")
    .replace(/\s*\.{2,}.*$/, "")
    .replace(/\s*\((?:see )?(?:page|p\.?)\s*\d+\).*$/i, "")
    .replace(/\s+(?:page\s+)?\d{1,3}$/i, "")
    // "(A-level only)", "(A- level only)", "(Further Maths only)".
    .replace(/\s*\([^()]*\bonly\)\s*$/i, "")
    // Letter or code prefixes inside a numbered heading: "3.2.1 A: Proof",
    // "3.1.1 OT1: Mathematical argument…".
    .replace(/^[A-Z]{1,2}\d{0,2}:\s+(?=[A-Z])/, "")
    .replace(/\s*\*+$/, "")
    // pdf.js splits "(x, y)" into "( x, y )".
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+([,:;])/g, "$1")
    .replace(/[.:;,\s–—-]+$/, "")
    .trim();
  // Unbalanced leftovers such as "…Enlightenment, 1682–1796 (A-level".
  if ((name.match(/\(/g) || []).length > (name.match(/\)/g) || []).length) {
    name = name.replace(/\s*\([^()]*$/, "").trim();
  }
  return name;
};

const looksLikeTopic = (name) => {
  if (name.length < 3 || name.length > 110) return false;
  if (!/^[A-Z‘'"(]/.test(name) || !/[a-z]{3}/.test(name)) return false;
  if (name.split(/\s+/).length > MAX_WORDS) return false;
  if (ADMIN.test(name) || COMMAND_WORD.test(name)) return false;
  // A sentence of body text rather than a heading.
  if (/[.!?]\s+[A-Z]/.test(name) || /\.$/.test(name)) return false;
  // Notation tables whose symbols pdf.js reads as stray letters: "Q the
  // empty set", "A l the complement of the set A".
  if (/^(?!A\s|I\s)[A-Z]{1,2}\s/.test(name) || /^A\s\S\s/.test(name)) return false;
  if (/[∈∉∩∪≤≥∞~#$=<>^¨]/.test(name)) return false;
  // Exam units rather than content: "Unit M1: Foundation Tier Completion Test".
  if (/\b(?:foundation|higher) tier\b|\bcompletion test\b/i.test(name)) return false;
  return true;
};

const isHeadingStart = (line) =>
  NUMBERED.test(line) || CODED.test(line) || new RegExp(String.raw`^(?:${LABELS})\s+\S+\s*[:–—-]`).test(line);

// Joins a title wrapped onto the next line: "…1469–1598 (A-level" + "only) 19",
// "…conflict, revolution and" + "settlement 32".
const withContinuation = (lines, index, name) => {
  const next = lines[index + 1];
  if (!next || next.length > 60 || isHeadingStart(next) || BULLET.test(next) || CONTENT_MARKER.test(next)) return name;
  const trimmed = name.replace(/\s+\d{1,3}$/, "");
  if (OPEN_ENDING.test(trimmed) || /^[a-z(]/.test(next)) return `${trimmed} ${next}`;
  return name;
};

// Every heading-shaped line, grouped into families ("numbered:2" for "3.1",
// "numbered:3" for "3.1.2", "topic", "unit", "coded", …). Within a family the
// first usable occurrence of each number wins; later ones (the body after
// the contents page) only count as repeats. Labels restart per component in
// some specs ("Section A" in every paper), so a labelled key that comes back
// with a different name is a new entry.
const collectFamilies = (lines) => {
  const families = new Map();
  const rejected = new Map();
  const add = (family, key, rawName, index, { restarts = false } = {}) => {
    const name = cleanTopicName(rawName);
    if (!looksLikeTopic(name)) {
      // Admin headings mark a chapter as admin; learning statements and
      // fragments say nothing about the chapter.
      if (ADMIN.test(name)) rejected.set(`${family}|${key}`, true);
      return;
    }
    if (!families.has(family)) families.set(family, new Map());
    const entries = families.get(family);
    let entryKey = key;
    let existing = entries.get(entryKey);
    if (existing && restarts) {
      const words = new Set(wordsOf(name).split(" "));
      let n = 1;
      while (existing && !wordsOf(existing.name).split(" ").some((word) => word.length > 3 && words.has(word))) {
        n += 1;
        entryKey = `${key}#${n}`;
        existing = entries.get(entryKey);
      }
    }
    if (existing) {
      existing.seen += 1;
      existing.variants.set(name, (existing.variants.get(name) || 0) + 1);
      return;
    }
    entries.set(entryKey, { key, name, index, seen: 1, variants: new Map([[name, 1]]) });
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.replace(BULLET, "");

    let match = line.match(NUMBERED);
    if (match) {
      const [, number, rest] = match;
      add(`numbered:${number.split(".").length}`, number, withContinuation(lines, index, rest), index);
      return;
    }

    match = line.match(CHAPTER);
    if (match) {
      add("numbered:1", match[1], withContinuation(lines, index, match[2]), index);
    }

    match = line.match(CODED);
    if (match) {
      add("coded", match[1], withContinuation(lines, index, match[2]), index, { restarts: true });
    }

    if (CONTENT_MARKER.test(line) && index > 0) {
      // The heading may be wrapped over the two lines above the marker.
      const above = lines[index - 1].replace(BULLET, "");
      const twoAbove = lines[index - 2]?.replace(BULLET, "") || "";
      const wrapped = OPEN_ENDING.test(twoAbove) && twoAbove.length < 60 && !CONTENT_MARKER.test(twoAbove);
      const name = wrapped ? `${twoAbove} ${above}` : above;
      // A heading, not the tail of the previous paragraph. A chapter with no
      // sub-headings ("3. Ratio, proportion…") is a topic itself.
      const heading = name.match(CHAPTER)?.[2] ?? name;
      if (!NUMBERED.test(heading) && heading.split(/\s+/).length <= 10 && !OPEN_ENDING.test(heading)) {
        add("marked", wordsOf(heading), heading, index - 1);
      }
    }

    const labelled = [...line.matchAll(LABELLED)];
    labelled.forEach((found, i) => {
      const [, label, number, rest] = found;
      const name = i === labelled.length - 1 ? withContinuation(lines, index, rest) : rest;
      // Option codes are shared with the coded family ("Option 1A" = "1A").
      const family = /^option$/i.test(label) && /^\d[A-Z]/.test(number) ? "coded" : label.toLowerCase();
      add(family, number.toUpperCase(), name, index, { restarts: true });
    });
  });

  // The same heading can read differently on the contents page, in an
  // overview table and in the body: keep the cleanest, most common wording
  // (the first one on a tie).
  families.forEach((entries) => {
    entries.forEach((entry) => {
      const [best] = [...entry.variants.entries()].sort(
        ([a, countA], [b, countB]) => Number(isRagged(a)) - Number(isRagged(b)) || countB - countA
      );
      entry.name = best[0];
    });
  });

  // Running headers and footers ("10 Cambridge OCR Level 3…") repeat one
  // name under many numbers.
  families.forEach((entries) => {
    const counts = new Map();
    entries.forEach(({ name }) => counts.set(wordsOf(name), (counts.get(wordsOf(name)) || 0) + 1));
    entries.forEach((entry, key) => {
      if (counts.get(wordsOf(entry.name)) >= 3) entries.delete(key);
    });
  });

  return { families, rejected };
};

const compareKeys = (a, b) => a.localeCompare(b, "en", { numeric: true });

// The ways numbered headings can be read as a checklist: the leaves
// (headings with no sub-headings of their own; AQA GCSE Maths mixes "3.1.1
// Structure and calculation" with a childless "3.3 Ratio, proportion…") and
// each single depth.
const numberedReadings = ({ families, rejected }) => {
  const all = [2, 3, 4].flatMap((depth) => [...(families.get(`numbered:${depth}`)?.values() || [])]);
  if (!all.length) return [];

  // A top-level number is a chapter of content when its headings are mostly
  // not admin (which leaves out "1.1 Why choose AQA", "5.1 Entries…") and it
  // is not a short appendix next to the chapters that hold the content
  // ("6.1 Arithmetic and numerical computation" after 120 chemistry headings).
  const passed = new Map();
  const failed = new Map();
  const top = (key) => key.split(".")[0];
  all.forEach(({ key }) => passed.set(top(key), (passed.get(top(key)) || 0) + 1));
  rejected.forEach((_, id) => {
    const [family, key] = id.split("|");
    if (/^numbered:[234]$/.test(family)) failed.set(top(key), (failed.get(top(key)) || 0) + 1);
  });
  // Maths specs end with the DfE notation list, numbered like content.
  all.forEach(({ key, name }) => {
    if (NOTATION.test(name)) failed.set(top(key), Infinity);
  });
  const biggest = Math.max(...passed.values());
  const inContent = ({ key }) => {
    const ok = passed.get(top(key)) || 0;
    return ok >= 2 && ok > (failed.get(top(key)) || 0) && ok >= biggest * MIN_CHAPTER_SHARE;
  };
  const content = all.filter(inContent);

  const hasChildren = (entry) => content.some((other) => other.key.startsWith(`${entry.key}.`));
  const leaves = content.filter((entry) => !hasChildren(entry));
  const levels = [2, 3, 4]
    .map((depth) => ({
      entries: content.filter(({ key }) => key.split(".").length === depth),
      parents: content.filter(({ key }) => key.split(".").length === depth - 1),
    }))
    // A single depth only reads well where most branches reach it; AQA
    // Biology's handful of "3.1.4.1" headings is not a checklist.
    .filter(({ parents }) => !parents.length || parents.filter(hasChildren).length >= parents.length * 0.6)
    .map(({ entries }) => entries);
  return [
    { family: "numbered", entries: leaves },
    ...levels.map((entries) => ({ family: "numbered", entries })),
  ];
};

const dedupeNames = (entries) => {
  const seen = new Set();
  return entries.filter(({ name }) => {
    const key = wordsOf(name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Labelled families can nest too (Edexcel Chemistry: "Topic 2" with "Topic
// 2A", "Topic 2B"), so they are offered whole, as leaves and as top level.
const labelledReadings = (family, entries) => {
  const isParentOf = (parent, child) =>
    child.key !== parent.key && child.key.startsWith(parent.key) && /^[A-Z.]/.test(child.key.slice(parent.key.length));
  const leaves = entries.filter((entry) => !entries.some((other) => isParentOf(entry, other)));
  const topLevel = entries.filter((entry) => !entries.some((other) => isParentOf(other, entry)));
  return [
    { family, entries },
    ...(leaves.length < entries.length ? [{ family, entries: leaves }, { family, entries: topLevel }] : []),
  ];
};

// A heading cut short or glued to text from another column.
const isRagged = (name) =>
  OPEN_ENDING.test(name) ||
  name.split(/\s+/).length > 10 ||
  /\s(?:\d{1,3}|marks?|[a-z])$/.test(name) ||
  // Exam details from a neighbouring table cell: "…2 hours 15 minutes", "37%".
  /\d\s*(?:%|marks?\b|hours?\b|minutes?\b)|\(\d{2}\)/i.test(name) ||
  /[a-z]\s[A-Z][a-z]+\s[a-z]/.test(name.slice(1)) && name.split(/\s+/).length > 7;

// How checklist-like a reading is: near the usual topic count, cleanly
// named, with headings that recur (contents page + body), and a small head
// start for families that name their topics outright ("Topic 3 – Genetics").
const LABELLED_BONUS = 2;
const scoreReading = ({ family, entries }) => {
  const size = -Math.abs(Math.log(entries.length / TARGET_TOPICS)) * 6;
  const clean = entries.filter(({ name }) => !isRagged(name)).length / entries.length;
  const repeated = entries.filter(({ seen }) => seen > 1).length / entries.length;
  const named = !/^numbered|^marked$/.test(family);
  return size + clean * 10 + repeated * 4 + (named ? LABELLED_BONUS : 0);
};

// Text that lost its line breaks is re-split before each section number, so
// "…Art History 1.1 Ancient Art 1.2 Modern Art" still reads: any line with
// two or more "N.N Title" starts (a two-column contents page does this too),
// and before chapter numbers as well on a very long line. A label cut off
// from its name at a line end ("…, Topic 4" + "– Natural selection…") is
// joined back up.
const LONG_LINE = 300;
const ANY_NUMBER_START = /\s(?=\d{1,2}(?:\.\d{1,2})*\s+[A-Z])/;
const LABEL_AT_END = new RegExp(String.raw`\b(?:${LABELS})\s+${LABEL_NUMBER}$`);
const splitRunOn = (line) => {
  if (line.length > LONG_LINE) return line.split(ANY_NUMBER_START);
  const sections = line.match(/(?:^|\s)\d{1,2}(?:\.\d{1,2})+\s+[A-Z]/g) || [];
  const numbers = line.match(/(?:^|\s)\d{1,2}(?:\.\d{1,2})*\s+[A-Z]/g) || [];
  if (sections.length >= 2) return line.split(ANY_NUMBER_START);
  return sections.length && numbers.length >= 2 ? line.split(ANY_NUMBER_START) : [line];
};
const toLines = (text) =>
  text
    .split(/\r?\n/)
    .flatMap(splitRunOn)
    .map(cleanWhitespace)
    .filter(Boolean)
    .reduce((lines, line) => {
      const previous = lines[lines.length - 1];
      if (previous && LABEL_AT_END.test(previous) && /^[:–—-]/.test(line)) lines[lines.length - 1] = `${previous} ${line}`;
      else lines.push(line);
      return lines;
    }, []);

// Every candidate reading of the text, best first (exported for tests and
// for debugging a spec that reads badly).
export function topicReadings(text) {
  const lines = toLines(text);
  const collected = collectFamilies(lines);
  const { families } = collected;

  return [
    ...numberedReadings(collected),
    ...[...families.entries()]
      .filter(([family]) => !/^numbered:[234]$/.test(family))
      .flatMap(([family, entries]) => labelledReadings(family, [...entries.values()])),
  ]
    .map(({ family, entries }) => ({
      family,
      entries: dedupeNames(
        [...entries].sort((a, b) => (family === "marked" ? a.index - b.index : compareKeys(a.key, b.key)))
      ),
    }))
    .filter(({ entries }) => entries.length >= MIN_TOPICS && entries.length <= MAX_TOPICS)
    .map((reading) => ({ ...reading, score: scoreReading(reading) }))
    .sort((a, b) => b.score - a.score);
}

export function inferTopicChecklist(text) {
  if (!text) return [];
  const [best] = topicReadings(text);
  if (best) return best.entries.map(({ name }) => name);

  // Short or hand-made documents: take whatever numbered headings there are.
  const { families } = collectFamilies(toLines(text));
  const loose = [1, 2, 3, 4].flatMap((depth) => [...(families.get(`numbered:${depth}`)?.values() || [])]);
  return dedupeNames(loose.sort((a, b) => compareKeys(a.key, b.key))).map(({ name }) => name);
}
