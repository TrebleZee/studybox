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

export function generateSubjectDraftFromSpecText(text, fileName = "") {
  return {
    subjectName: inferSubjectName(text, fileName),
    examBoard: inferExamBoard(text, fileName),
    topics: inferTopicChecklist(text),
  };
}
