// Pure helpers for scripts/draft-spec.js: turn the text lines of a board's
// spec PDF into a *draft* catalogue spec. Dev-only - nothing here ships in
// the app bundle. A draft is a starting point for a human to check against
// the PDF, never something to commit unedited: it deliberately fails
// validateSpec (papers unassigned, firstExam missing) until it is finished.

const TRAILING_PAGE = /\s+\d{1,3}$/;
// Content that follows a heading on the same line in two-column tables,
// e.g. OCR's "1.1.1 Structure and function of the processor (a) The ALU".
const INLINE_CONTENT = /\s+\((?:a|i)\)\s.*$/;
const MAX_NAME_LENGTH = 80;

const cleanName = (name) =>
  name
    .replace(INLINE_CONTENT, "")
    .replace(TRAILING_PAGE, "")
    .replace(/\s+/g, " ")
    .replace(/[.:;,\s]+$/, "")
    .trim();

// Administrative sections every board prints; never topics.
const BOILERPLATE = [
  /^why choose/i,
  /^support and resources/i,
  /^subject content$/i,
  /^assessments?$/i,
  /^aims/i,
  /^assessment (objectives|weightings|overview)/i,
  /^entries and codes/i,
  /^overlaps with/i,
  /^awarding grades/i,
  /^re-?sits/i,
  /^previous learning/i,
  /^access to assessment/i,
  /^working with /i,
  /^private candidates/i,
  /^key ideas$/i,
  /^(introduction|overview|contents|appendix|glossary)\b/i,
  /^(qualification|specification) at a glance/i,
];

export const isBoilerplate = (name) => BOILERPLATE.some((pattern) => pattern.test(name));

const looksLikeHeading = (name) =>
  !isBoilerplate(name) &&
  name.length >= 3 &&
  name.length <= MAX_NAME_LENGTH &&
  /^[A-Z(‘'"]/.test(name) &&
  /[a-z]/i.test(name) &&
  !/\.{3,}/.test(name);

// Numbered headings such as "3.1 Number" or "4.2.1 Cell structure".
// depth = how many number parts a heading has (2 for "3.1", 3 for "3.1.2").
// The first occurrence of each number usually comes from the contents page;
// later occurrences are kept only if the contents entry was unusable.
export const numberedHeadings = (lines, { depth = 2 } = {}) => {
  const pattern = new RegExp(String.raw`^\s*(\d{1,2}(?:\.\d{1,2}){${depth - 1}})\.?\s+(.+)$`);
  const byNumber = new Map();

  lines.forEach((line) => {
    const match = line.match(pattern);
    if (!match) return;
    const [, number, rest] = match;
    // A deeper number ("3.1.2" when depth is 2) is not this heading level.
    if (/^\.\d/.test(rest)) return;
    const name = cleanName(rest);
    if (!looksLikeHeading(name) || byNumber.has(number)) return;
    byNumber.set(number, name);
  });

  return [...byNumber.entries()]
    .map(([number, name]) => ({ number, name }))
    .sort((a, b) => compareNumbers(a.number, b.number));
};

// Mixed-depth specs (AQA GCSE Maths: "3.1.1 Structure and calculation" but
// "3.3 Ratio, proportion..." with no children): keep the deepest heading on
// each branch, i.e. 2- and 3-part headings that have no sub-headings.
export const leafHeadings = (lines) => {
  const all = [...numberedHeadings(lines, { depth: 2 }), ...numberedHeadings(lines, { depth: 3 })];
  return all
    .filter(({ number }) => !all.some((other) => other.number.startsWith(`${number}.`)))
    .sort((a, b) => compareNumbers(a.number, b.number));
};

const compareNumbers = (a, b) => {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] ?? -1) - (right[i] ?? -1);
    if (diff) return diff;
  }
  return 0;
};

// Pearson's layout: a line holding only the topic number, the topic title
// wrapped over the next few lines, then the first "N.1" sub-heading.
export const stackedHeadings = (lines) => {
  const found = [];
  const seen = new Set();

  lines.forEach((line, index) => {
    const match = line.match(/^\s*(\d{1,2})\s*$/);
    if (!match) return;
    const number = match[1];
    const firstSub = new RegExp(String.raw`^\s*${number}\.1\b`);
    const parts = [];
    for (let j = index + 1; j < Math.min(index + 8, lines.length); j += 1) {
      if (firstSub.test(lines[j])) {
        const name = cleanName(parts.join(" "));
        const key = `${number}|${name.toLowerCase()}`;
        // Long topics restart on a new page as "<name> continued".
        if (looksLikeHeading(name) && !/\bcontinued$/i.test(name) && !seen.has(key)) {
          seen.add(key);
          found.push({ number, name });
        }
        return;
      }
      parts.push(lines[j]);
    }
  });

  return found;
};

// Paper / component names as boards print them, e.g. "Paper 1: Pure
// Mathematics 1", "Component 01: Computer systems", "Biology Paper 2".
// Unlike topic headings, a paper name's trailing number is meaningful
// ("Pure Mathematics 1"), so only cut at a comma or dash that starts a note.
const cleanPaperName = (name) =>
  name
    .split(/,|\s[–-]\s/)[0]
    .replace(/[(*\s]+$/, "")
    .trim();

const paperId = (number) => `p${number.toLowerCase().replace(/^0/, "")}`;

export const paperCandidates = (lines) => {
  const found = new Map();
  const add = (id, name) => {
    if (!found.has(id) && name.length >= 3 && /[a-z]/i.test(name)) found.set(id, name);
  };

  lines.forEach((line) => {
    let match = line.match(/^\s*(?:Paper|Component)\s+(\d{1,2}[A-D]?)\s*[:–-]\s*(.{3,80})$/i);
    if (match) {
      add(paperId(match[1]), cleanPaperName(match[2].split("(")[0]));
      return;
    }
    // OCR: "Computer systems (Component 01)".
    match = line.match(/^\s*([A-Z][^()]{2,60}?)\s*\(Component\s+(\d{1,2})\)/);
    if (match) {
      add(paperId(match[2]), cleanPaperName(match[1]));
      return;
    }
    // AQA sciences: "Biology Paper 1".
    match = line.match(/^\s*([A-Z][a-z]+)\s+Paper\s+(\d)\s*$/);
    if (match) add(`${match[1][0].toLowerCase()}${match[2]}`, `${match[1]} Paper ${match[2]}`);
  });

  return [...found.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
};

// Builds the draft spec object. `meta` carries what the author passes on the
// command line (board, spec, qualification, subject, specName, specUrl).
// `sections` (optional) keeps only headings whose first number is listed,
// e.g. ["4", "5", "6"] for the subject-content chapters.
export const buildDraftSpec = (lines, meta, { depth = 2, layout = "numbered", sections } = {}) => {
  const id = `${meta.board}-${meta.spec}`.toLowerCase();
  const headings = (
    layout === "stacked"
      ? stackedHeadings(lines)
      : depth === "leaf"
        ? leafHeadings(lines)
        : numberedHeadings(lines, { depth })
  ).filter((heading) => !sections?.length || sections.includes(heading.number.split(".")[0]));
  const papers = paperCandidates(lines);

  return {
    id,
    qualification: meta.qualification,
    board: meta.board,
    spec: meta.spec,
    subject: meta.subject || "TODO",
    specName: meta.specName ?? meta.subject ?? null,
    specVersion: "TODO",
    firstExam: null,
    lastExam: null,
    specUrl: meta.specUrl || "TODO",
    tiers: meta.qualification === "gcse" && meta.tiered ? ["foundation", "higher"] : null,
    papers: papers.length ? papers : [{ id: "p1", name: "TODO" }],
    topics: headings.map((heading, index) => ({
      id: `${id}-t${String(index + 1).padStart(2, "0")}`,
      name: heading.name,
      paper: "TODO",
      higherOnly: false,
      _source: heading.number,
    })),
    optionGroups: [],
    milestones: [],
  };
};
