const BOARD_MATCHERS = [
  { name: "OCR A", regex: /\bOCR\b[^A-Za-z0-9]{0,12}\bA\b/i },
  { name: "OCR", regex: /\bOCR\b/i },
  { name: "AQA", regex: /\bAQA\b/i },
  { name: "Pearson Edexcel", regex: /\bPearson\b.*\bEdexcel\b/i },
  { name: "Edexcel", regex: /\bEdexcel\b/i },
  { name: "WJEC Eduqas", regex: /\b(Eduqas|WJEC)\b/i },
  { name: "CCEA", regex: /\bCCEA\b/i },
  { name: "SQA", regex: /\bSQA\b/i },
  { name: "IB", regex: /\bIB\b|\bInternational Baccalaureate\b/i },
];

const SUBJECT_MATCHERS = [
  ["Further Mathematics", /\bfurther mathematics\b/i],
  ["Computer Science", /\bcomputer science\b/i],
  ["Physics", /\bphysics\b/i],
  ["Chemistry", /\bchemistry\b/i],
  ["Biology", /\bbiology\b/i],
  ["Mathematics", /\bmathematics\b/i],
  ["Maths", /\bmaths\b/i],
  ["English Literature", /\benglish literature\b/i],
  ["English Language", /\benglish language\b/i],
  ["Art History", /\bart history\b/i],
  ["History", /\bhistory\b/i],
  ["Geography", /\bgeography\b/i],
  ["Economics", /\beconomics\b/i],
  ["Psychology", /\bpsychology\b/i],
  ["Sociology", /\bsociology\b/i],
  ["Business", /\bbusiness\b/i],
  ["Art and Design", /\bart and design\b/i],
];

const GENERIC_SKIP = [
  "specification",
  "subject content",
  "introduction",
  "assessment",
  "contents",
  "qualification",
  "version",
  "centre",
  "paper",
  "appendix",
  "glossary",
  "overview",
  "guidance",
  "support",
  "chapter",
  "page",
];

const TITLE_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "the",
  "to",
  "with",
  "specification",
  "subject",
  "content",
  "contents",
  "exam",
  "board",
  "level",
  "course",
  "syllabus",
  "pdf",
]);

const cleanWhitespace = (value) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stripPageSuffix = (line) =>
  line.replace(/\s+\d+$/, "").replace(/\s+\.{2,}\s*\d+$/, "");

const toTitleCase = (text) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      TITLE_STOP_WORDS.has(word.toLowerCase())
        ? word.toLowerCase()
        : `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`
    )
    .join(" ");

const isMostlyUppercase = (text) => {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (!letters) return false;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length > 0.7;
};

const normalizeHeading = (line) => {
  const cleaned = cleanWhitespace(stripPageSuffix(line)).replace(/^[•\-–—]\s*/, "");
  return cleaned.replace(/^(\d+(?:\.\d+)*)\s+/, "$1 ");
};

const safeFilename = (filename) =>
  cleanWhitespace(filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));

export function inferExamBoard(text, fileName = "") {
  const haystack = `${text}\n${fileName}`;
  for (const board of BOARD_MATCHERS) {
    if (board.regex.test(haystack)) {
      return board.name;
    }
  }
  return "Custom";
}

export function inferSubjectName(text, fileName = "") {
  const haystack = `${text}\n${fileName}`.toLowerCase();
  for (const [subject, matcher] of SUBJECT_MATCHERS) {
    if (matcher.test(haystack)) {
      return subject;
    }
  }

  const lines = text
    .split(/\r?\n/)
    .map(cleanWhitespace)
    .filter(Boolean)
    .slice(0, 60);

  const candidates = lines
    .map((line) => normalizeHeading(line))
    .filter((line) => !GENERIC_SKIP.some((skip) => line.toLowerCase().includes(skip)))
    .filter((line) => /^[A-Za-z0-9][A-Za-z0-9()/'",&\- ]{3,}$/.test(line));

  const scored = candidates
    .map((candidate) => {
      const lower = candidate.toLowerCase();
      let score = 0;
      if (/^\d+(?:\.\d+)*\s+/.test(candidate)) score += 2;
      if (candidate.length < 60) score += 1;
      if (/^[A-Z]/.test(candidate)) score += 1;
      if (!/\b(specification|contents|introduction|assessment|version)\b/i.test(candidate)) {
        score += 2;
      }
      if (/(physics|maths|mathematics|computer science|chemistry|biology|history|geography|economics|psychology|sociology|business|english)\b/i.test(lower)) {
        score += 8;
      }
      if (isMostlyUppercase(candidate)) score += 1;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score >= 4) {
    const matched = SUBJECT_MATCHERS.find(([, matcher]) =>
      matcher.test(scored[0].candidate.toLowerCase())
    );
    if (matched) return matched[0];
    return toTitleCase(scored[0].candidate.replace(/^\d+(?:\.\d+)*\s+/, ""));
  }

  const fallback = safeFilename(fileName || "Imported subject")
    .replace(/\b(specification|spec|subject content|contents|course|syllabus|pdf|a level|gcse)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!fallback) return "Imported subject";
  const fallbackMatch = SUBJECT_MATCHERS.find(([, matcher]) => matcher.test(fallback.toLowerCase()));
  if (fallbackMatch) return fallbackMatch[0];
  return toTitleCase(fallback);
}

export function inferTopicChecklist(text) {
  if (!text) return [];

  const headingStartRegex = /\b(\d+(?:\.\d+)*)\s+([A-Z])/g;
  const matches = [];
  let match;

  while ((match = headingStartRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const num = match[1];
    const firstChar = match[2];

    const beforeIndex = matchIndex - 1;
    if (beforeIndex >= 0 && !/\s/.test(text[beforeIndex])) {
      continue;
    }

    matches.push({
      index: matchIndex,
      num,
      firstChar,
    });
  }

  const headings = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const endPos = next ? next.index : text.length;
    const chunk = text.slice(current.index, endPos);

    const normalized = normalizeHeading(chunk);
    if (normalized) {
      headings.push(normalized);
    }
  }

  if (headings.length === 0) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const normalized = normalizeHeading(line);
      if (normalized) {
        if (/^\d+(?:\.\d+)*\s+/.test(normalized)) {
          headings.push(normalized);
        }
      }
    }
  }

  const topics = [];
  for (const heading of headings) {
    const lower = heading.toLowerCase();
    if (GENERIC_SKIP.some((skip) => lower.includes(skip))) {
      continue;
    }

    const topicName = heading.replace(/^\d+(?:\.\d+)*\s+/, "");
    const cleanedTopic = toTitleCase(topicName);
    if (cleanedTopic) {
      topics.push(cleanedTopic);
    }
  }

  return topics;
}

// --- Spec codes -------------------------------------------------------------
// Each board prints its own shape of code:
//   AQA      4 digits, 7xxx (AS/A-level) or 8xxx (GCSE)         e.g. 8300, 7408
//   Edexcel  digit, two letters, digit                           e.g. 1MA1, 9MA0, 1SC0
//   OCR      H (AS/A-level) or J (GCSE) and 3 digits             e.g. H556, J560
// Bare numbers are everywhere in a spec (pages, years, marks), so an AQA
// code only counts next to the board name, in an aqa.org.uk/<code> link, or
// in brackets on a document that names AQA somewhere.
const FIRST_PAGES = 4000;
const NEAR = 150;
const BOARD_NAME = {
  AQA: /\bAQA\b/gi,
  Edexcel: /\b(Edexcel|Pearson)\b/gi,
  OCR: /\bOCR\b/gi,
};
const CODE_PATTERNS = [
  { board: "AQA", regex: /(?<![\d.,£$])\b([78]\d{3})\b(?![.,]\d|%|\d)/g },
  { board: "Edexcel", regex: /\b([1-9][A-Z]{2}[0-9])\b/g },
  { board: "OCR", regex: /\b([HJ]\d{3})\b(?![.,]\d)/g },
];

const indexesOf = (text, regex) => [...text.matchAll(new RegExp(regex.source, regex.flags))].map((m) => m.index);

const isNear = (index, anchors) => anchors.some((anchor) => Math.abs(anchor - index) <= NEAR);

// Returns { board, spec } for the most likely spec code (board as in BOARDS),
// or null. Codes near the board name, on the first pages or in the file name
// score higher; a code for a board the document never names is ignored.
export function inferSpecCode(text = "", fileName = "") {
  // The file name counts as the very first page (e.g. "AQA-8300-SP-2015.PDF").
  const haystack = `${fileName.replace(/[-_.]+/g, " ")}\n${text}`;
  const fileNameEnd = fileName.length + 1;
  const scores = new Map();

  CODE_PATTERNS.forEach(({ board, regex }) => {
    const anchors = indexesOf(haystack, BOARD_NAME[board]);
    if (!anchors.length) return;

    for (const match of haystack.matchAll(regex)) {
      const code = match[1].toUpperCase();
      const index = match.index;
      const inBrackets = haystack[index - 1] === "(" && haystack[index + code.length] === ")";
      const inAqaLink = /aqa\.org\.uk\/$/i.test(haystack.slice(Math.max(0, index - 11), index));
      const near = isNear(index, anchors);
      if (board === "AQA" && !near && !inAqaLink && !inBrackets) continue;

      let score = 1;
      if (near || inAqaLink) score += 4;
      if (inBrackets) score += 2;
      if (index < fileNameEnd) score += 5;
      else if (index < fileNameEnd + FIRST_PAGES) score += 3;

      const key = `${board}|${code}`;
      const current = scores.get(key) || { board, spec: code, score: 0, first: index, hits: 0 };
      // Repeats help a little, but can't outvote a strong first-page hit.
      current.hits += 1;
      current.score += current.hits <= 3 ? score : 0;
      current.first = Math.min(current.first, index);
      scores.set(key, current);
    }
  });

  // Joint covers list several codes (AQA "AS and A-level Physics (7407,
  // 7408)", Edexcel 8FM0 + 9FM0). Codes whose level matches the cover win.
  const qualification = inferQualification(text, fileName);
  const candidates = [...scores.values()].map((candidate) => ({
    ...candidate,
    score: candidate.score + (levelMatches(codeLevel(candidate), qualification) ? 2 : 0),
  }));
  const best = candidates.sort(
    (a, b) => b.score - a.score || aqaJointTieBreak(a, b, qualification) || a.first - b.first
  )[0];
  return best ? { board: best.board, spec: best.spec } : null;
}

// The level a code's shape implies: "gcse", "as", "alevel", "advanced" (AQA
// 7xxx, which is used for both AS and A-level) or null.
const codeLevel = ({ board, spec }) => {
  if (board === "AQA") return spec.startsWith("8") ? "gcse" : "advanced";
  if (board === "OCR") return spec.startsWith("J") ? "gcse" : spec[1] === "1" ? "as" : "alevel";
  return { 1: "gcse", 8: "as", 9: "alevel" }[spec[0]] || null;
};

const levelMatches = (level, qualification) =>
  Boolean(level && qualification) &&
  (level === qualification || (level === "advanced" && qualification !== "gcse"));

// AQA numbers an A-level straight after its AS (7407 AS, 7408 A-level), so on
// a joint cover the higher code is the A-level one.
const aqaJointTieBreak = (a, b, qualification) => {
  if (a.board !== "AQA" || b.board !== "AQA" || !["alevel", "as"].includes(qualification)) return 0;
  const diff = Number(b.spec) - Number(a.spec);
  return qualification === "alevel" ? diff : -diff;
};

// "gcse", "alevel" or "as" from the cover pages, or null if unclear. A joint
// "AS and A-level" spec counts as A-level.
export function inferQualification(text = "", fileName = "") {
  const cover = `${fileName}\n${text.slice(0, FIRST_PAGES)}`;
  const first = (regex) => {
    const match = cover.match(regex);
    return match ? match.index : Infinity;
  };
  const alevel = first(/\bA[- ]?level\b|\bAdvanced GCE\b/i);
  const as = first(/\bAS[- ]level\b|\bAdvanced Subsidiary\b/i);
  const gcse = first(/\bGCSE\b/i);

  if (alevel === Infinity && as === Infinity && gcse === Infinity) return null;
  if (gcse < Math.min(alevel, as)) return "gcse";
  return alevel === Infinity ? "as" : "alevel";
}

export function generateSubjectDraftFromSpecText(text, fileName = "") {
  return {
    subjectName: inferSubjectName(text, fileName),
    examBoard: inferExamBoard(text, fileName),
    specCode: inferSpecCode(text, fileName),
    qualification: inferQualification(text, fileName),
    topics: inferTopicChecklist(text),
  };
}
