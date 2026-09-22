const TOPIC_SEED = {
  physics: [
    "Practical Skills in Physics",
    "Foundations of Physics",
    "Forces and Motion",
    "Electrons, Waves and Photons",
    "Newtonian World and Astrophysics",
    "Particles and Medical Physics",
  ],
  maths: [
    "Algebra and Functions",
    "Coordinate Geometry",
    "Sequences and Series",
    "Trigonometry",
    "Exponentials and Logarithms",
    "Differentiation",
    "Integration",
    "Vectors",
    "Statistical Sampling",
    "Probability and Distributions",
    "Hypothesis Testing",
    "Kinematics",
    "Forces and Newton's Laws",
    "Projectiles and Moments",
  ],
  further: [
    "Complex Numbers",
    "Argand Diagrams",
    "Matrices",
    "Linear Transformations",
    "Further Algebra",
    "Series and Sums",
    "Further Calculus",
    "Polar Coordinates",
    "Hyperbolic Functions",
    "Differential Equations",
    "Further Vectors",
    "Proof by Induction",
  ],
  cs: [
    "Components of a Computer",
    "Software and Software Development",
    "Exchanging Data",
    "Data Types, Structures and Algorithms",
    "Legal, Moral and Ethical Issues",
    "Elements of Computational Thinking",
    "Problem Solving and Programming",
    "Algorithms",
    "Theory of Computation",
    "NEA Programming Project",
  ],
  "gcse-english": [
    "Reading Non-Fiction",
    "Reading Fiction",
    "Creative Writing",
    "Transactional Writing",
    "Poetry Analysis",
    "Shakespeare",
    "A 19th-Century Novel",
    "Modern Prose or Drama",
  ],
  "gcse-maths": [
    "Number",
    "Algebra",
    "Ratio, Proportion and Rates of Change",
    "Geometry and Measures",
    "Probability",
    "Statistics",
  ],
  "gcse-science": [
    "Cell Biology",
    "Organisation",
    "Infection and Response",
    "Bioenergetics",
    "Atomic Structure and the Periodic Table",
    "Bonding, Structure and Properties of Matter",
    "Energy Changes",
    "Forces",
    "Waves",
    "Electricity",
  ],
};

const ALEVEL_PRESETS = [
  { id: "physics", name: "Physics", exam: "OCR A", color: "#4F9CF9" },
  { id: "maths", name: "Maths", exam: "Edexcel", color: "#34D399" },
  { id: "further", name: "Further Maths", exam: "Edexcel", color: "#A78BFA" },
  { id: "cs", name: "Computer Science", exam: "OCR", color: "#FBBF24" },
];

const GCSE_PRESETS = [
  { id: "gcse-english", name: "English", exam: "AQA", color: "#F472B6" },
  { id: "gcse-maths", name: "Maths", exam: "AQA", color: "#34D399" },
  { id: "gcse-science", name: "Combined Science", exam: "AQA", color: "#60A5FA" },
];

export const SUBJECT_PRESETS = [...ALEVEL_PRESETS, ...GCSE_PRESETS];

// Onboarding starter templates. "alevel" doubles as the app's true default
// (see defaultSubjects below) - every other template is only ever reached
// by an explicit choice in Onboarding. A template either lists `presets`
// (built from TOPIC_SEED) or `specs` (loaded from the catalogue in
// src/data/specs, see subjectsForTemplate in catalogue.js).
export const TEMPLATES = [
  {
    id: "alevel",
    name: "A-Level example set",
    description:
      "Physics, Maths, Further Maths and Computer Science with sample A-level topics.",
    presets: ALEVEL_PRESETS,
  },
  {
    id: "gcse",
    name: "GCSE core subjects",
    description:
      "AQA English Language, English Literature, Maths and Combined Science with their spec topic lists.",
    specs: [
      { specId: "aqa-8700", color: "#F472B6" },
      {
        specId: "aqa-8702",
        color: "#FB923C",
        optionIds: ["macbeth", "christmas-carol", "inspector-calls", "power-and-conflict"],
      },
      { specId: "aqa-8300", color: "#34D399" },
      { specId: "aqa-8464", color: "#60A5FA" },
    ],
  },
];

export const topicList = (seed, prefix) =>
  seed.map((name, index) => ({
    id: `${prefix}${index}`,
    name,
    done: false,
    subtasks: [],
  }));

export const subjectsFromPresets = (presets) =>
  presets.map((subject) => ({
    ...subject,
    topics: topicList(TOPIC_SEED[subject.id] || [], subject.id.slice(0, 2)),
  }));

export const defaultSubjects = () => subjectsFromPresets(ALEVEL_PRESETS);

export const QUALIFICATIONS = ["gcse", "alevel", "as", "other"];
export const BOARDS = ["AQA", "Edexcel", "OCR", "Eduqas", "WJEC", "CCEA", "Custom"];
export const TIERS = ["foundation", "higher"];

export const QUALIFICATION_LABELS = {
  gcse: "GCSE",
  alevel: "A-level",
  as: "AS",
  other: "Other",
};

export const TIER_LABELS = { foundation: "Foundation", higher: "Higher" };

// Exact metadata for the built-in example subjects. Applied during migration
// only while the stored exam text still matches the preset's original label,
// so a preset the user re-pointed at another board isn't overwritten.
const PRESET_METADATA = {
  physics: { qualification: "alevel", board: "OCR", spec: "H556", specName: "Physics A" },
  maths: { qualification: "alevel", board: "Edexcel", spec: "9MA0", specName: null },
  further: { qualification: "alevel", board: "Edexcel", spec: "9FM0", specName: null },
  cs: { qualification: "alevel", board: "OCR", spec: "H446", specName: null },
  "gcse-english": { qualification: "gcse", board: "AQA", spec: null, specName: null },
  "gcse-maths": { qualification: "gcse", board: "AQA", spec: "8300", specName: null },
  "gcse-science": {
    qualification: "gcse",
    board: "AQA",
    spec: "8464",
    specName: "Combined Science Trilogy",
  },
};

// Order matters: "WJEC Eduqas" resolves to Eduqas, "Pearson" alone to Edexcel.
const BOARD_PATTERNS = [
  ["AQA", /\bAQA\b/i],
  ["Edexcel", /\b(edexcel|pearson)\b/i],
  ["OCR", /\bOCR\b/i],
  ["Eduqas", /\beduqas\b/i],
  ["WJEC", /\bWJEC\b/i],
  ["CCEA", /\bCCEA\b/i],
];

export const boardFromText = (text) => {
  const value = typeof text === "string" ? text : "";
  const match = BOARD_PATTERNS.find(([, regex]) => regex.test(value));
  return match ? match[0] : "Custom";
};

const qualificationFromText = (text) => {
  if (/\bGCSE\b/i.test(text)) return "gcse";
  if (/\bA[- ]?levels?\b/i.test(text)) return "alevel";
  if (/\bAS\b/.test(text)) return "as";
  return "other";
};

// Kept untrimmed so editing a field never swallows a space mid-typing.
const cleanString = (value) => (typeof value === "string" && value.trim() ? value : null);

// The legacy `exam` string, still written so older app versions reading a
// backup show something sensible. Custom subjects keep their own free text
// (possibly empty while being edited - subjectLabel falls back to "Custom").
export const deriveExam = ({ board, specName, exam }) => {
  if (board === "Custom") return typeof exam === "string" ? exam : "Custom";
  return [board, specName].filter(Boolean).join(" ");
};

const subjectMetadata = (subject, preset) => {
  const exam = cleanString(subject?.exam)?.trim() || preset?.exam || "Custom";
  let meta;

  if (BOARDS.includes(subject?.board)) {
    meta = {
      qualification: QUALIFICATIONS.includes(subject.qualification)
        ? subject.qualification
        : "other",
      board: subject.board,
      spec: cleanString(subject.spec),
      specName: cleanString(subject.specName),
      tier: TIERS.includes(subject.tier) ? subject.tier : null,
    };
  } else if (PRESET_METADATA[subject?.id] && exam === preset.exam) {
    meta = { ...PRESET_METADATA[subject.id], tier: null };
  } else {
    const board = boardFromText(exam);
    meta = {
      qualification:
        board === "Custom" ? "other" : qualificationFromText(`${exam} ${subject?.name || ""}`),
      board,
      spec: null,
      specName: null,
      tier: null,
    };
  }

  if (meta.qualification !== "gcse") meta.tier = null;
  // Once a subject has a stored board, its free text is taken verbatim.
  const examText =
    BOARDS.includes(subject?.board) && typeof subject.exam === "string" ? subject.exam : exam;
  return { ...meta, exam: deriveExam({ ...meta, exam: examText }) };
};

// e.g. "OCR A-level Physics A", "AQA GCSE Maths (Higher)", or the free-text
// exam label for Custom subjects.
export const subjectLabel = (subject) => {
  if (!subject) return "";
  if (!BOARDS.includes(subject.board) || subject.board === "Custom") {
    return subject.exam || "Custom";
  }
  const level =
    subject.qualification === "other" ? null : QUALIFICATION_LABELS[subject.qualification];
  const tier =
    subject.qualification === "gcse" && TIER_LABELS[subject.tier]
      ? `(${TIER_LABELS[subject.tier]})`
      : null;
  return [subject.board, level, subject.specName || subject.name, tier]
    .filter(Boolean)
    .join(" ");
};

// The untouched check compares normalized forms, so it keeps working now that
// normalization adds metadata that the frozen defaultSubjects() doesn't carry.
export const isUntouchedDefaultSubjects = (subjects) =>
  JSON.stringify(normalizeSubjects(subjects)) ===
  JSON.stringify(normalizeSubjects(defaultSubjects()));

// Merge an edit into a subject and re-derive exam/tier so they never go stale.
// Only the metadata is re-derived: other fields (e.g. a name mid-edit, briefly
// empty) are kept exactly as typed.
export const updateSubjectFields = (subject, patch) => {
  const next = { ...subject, ...patch };
  const preset = SUBJECT_PRESETS.find((item) => item.id === next.id);
  return { ...next, ...subjectMetadata(next, preset) };
};

export const normalizeSubjects = (input) => {
  if (!Array.isArray(input)) {
    return defaultSubjects().map((subject, index) => normalizeSubject(subject, index));
  }

  return input.map((subject, index) => normalizeSubject(subject, index));
};

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

// A topic's paper is one paper id, or a list of ids when the topic is
// examined on several papers (e.g. A-level Maths pure content on papers 1
// and 2). Returns the list form; [] when the topic has no paper.
export const topicPapers = (topic) => {
  if (Array.isArray(topic?.paper)) return topic.paper;
  return isNonEmptyString(topic?.paper) ? [topic.paper] : [];
};

// Optional `papers: [{ id, name }]`, kept only when there is a valid one, so
// subjects without papers normalize exactly as before.
const normalizePapers = (papers) => {
  if (!Array.isArray(papers)) return null;
  const seen = new Set();
  const valid = papers
    .filter((paper) => isNonEmptyString(paper?.id) && !seen.has(paper.id) && seen.add(paper.id))
    .map((paper) => ({
      id: paper.id,
      name: isNonEmptyString(paper.name) ? paper.name : paper.id,
    }));
  return valid.length ? valid : null;
};

// A topic's optional `paper` (string, or list of strings) and `higherOnly`
// (kept only when true).
const topicTierFields = (topic) => {
  const papers = [...new Set(topicPapers(topic).filter(isNonEmptyString))];
  return {
    ...(papers.length ? { paper: Array.isArray(topic.paper) ? papers : papers[0] } : {}),
    ...(topic?.higherOnly === true ? { higherOnly: true } : {}),
  };
};

export const normalizeSubject = (subject, index = 0) => {
  const preset = SUBJECT_PRESETS.find((item) => item.id === subject?.id);
  const sourceTopics = Array.isArray(subject?.topics) ? subject.topics : [];
  const papers = normalizePapers(subject?.papers);

  return {
    id: subject?.id || `sub-${Date.now().toString(36)}-${index}`,
    name: subject?.name || preset?.name || "Untitled subject",
    ...subjectMetadata(subject, preset),
    color: subject?.color || preset?.color || "#4F9CF9",
    ...(papers ? { papers } : {}),
    topics: sourceTopics.map((topic, topicIndex) => ({
      id: topic?.id || `${subject?.id || "sub"}-${topicIndex}`,
      name: topic?.name || "Untitled topic",
      done: Boolean(topic?.done),
      subtasks: (Array.isArray(topic?.subtasks) ? topic.subtasks : []).map(
        (subtask, subtaskIndex) => ({
          id: subtask?.id || `${topic?.id || topicIndex}-st${subtaskIndex}`,
          name: subtask?.name || "Untitled subtask",
          done: Boolean(subtask?.done),
        })
      ),
      // Only topics seeded from the catalogue carry this.
      ...(typeof topic?.catalogueTopicId === "string"
        ? { catalogueTopicId: topic.catalogueTopicId }
        : {}),
      ...topicTierFields(topic),
    })),
  };
};

export const normalizeSessions = (input) => {
  if (!Array.isArray(input)) return [];

  return input.map((session, index) => ({
    id: session?.id || `sess-${Date.now().toString(36)}-${index}`,
    subjectId: session?.subjectId || "",
    subjectName: session?.subjectName || "",
    subjectColor: session?.subjectColor || "#888888",
    duration: Number(session?.duration) || 0,
    date: session?.date || new Date().toISOString(),
    note: session?.note || "",
    tags: Array.isArray(session?.tags) ? session.tags.filter(Boolean) : [],
  }));
};

export const addUniqueTag = (current, nextTag) => {
  const cleaned = nextTag.trim().replace(/\s+/g, " ");
  if (!cleaned) return current;

  const exists = current.some(
    (tag) => tag.toLowerCase() === cleaned.toLowerCase()
  );
  return exists ? current : [...current, cleaned];
};

// The topics a subject's tier actually sits: a Foundation GCSE skips
// higher-only topics; every other subject (including an unset tier) has all.
export const inTierTopics = (subject) =>
  subject.tier === "foundation"
    ? subject.topics.filter((topic) => !topic.higherOnly)
    : subject.topics;

const percentDone = (topics) =>
  topics.length
    ? Math.round((topics.filter((topic) => topic.done).length / topics.length) * 100)
    : 0;

export const subjectProgress = (subject) => percentDone(inTierTopics(subject));

// Progress on one paper: in-tier topics examined on it (including topics
// shared with other papers). 0 when the paper has no topics.
export const paperProgress = (subject, paperId) =>
  percentDone(inTierTopics(subject).filter((topic) => topicPapers(topic).includes(paperId)));

// Groups topics for display: one group per distinct paper combination, in
// the subject's paper order, then "Other" for topics with no known paper.
// Returns [] when no topic has a paper, so callers can keep a flat list.
export const groupTopicsByPaper = (subject, topics = subject.topics) => {
  const papers = subject.papers || [];
  const order = new Map(papers.map((paper, index) => [paper.id, index]));
  const known = (topic) => topicPapers(topic).filter((id) => order.has(id));
  if (!topics.some((topic) => known(topic).length)) return [];

  const groups = new Map();
  topics.forEach((topic) => {
    const ids = known(topic).sort((a, b) => order.get(a) - order.get(b));
    const key = ids.join("+") || "";
    if (!groups.has(key)) {
      const name = !ids.length
        ? "Other"
        : ids.length > 1 && ids.length === papers.length
          ? "All papers"
          : ids.map((id) => papers[order.get(id)].name).join(" & ");
      groups.set(key, { key, paperIds: ids, name, topics: [] });
    }
    groups.get(key).topics.push(topic);
  });

  return [...groups.values()].sort((a, b) => {
    if (!a.paperIds.length) return 1;
    if (!b.paperIds.length) return -1;
    const byFirst = order.get(a.paperIds[0]) - order.get(b.paperIds[0]);
    if (byFirst || a.paperIds.length !== b.paperIds.length) return byFirst || a.paperIds.length - b.paperIds.length;
    // Same first paper and size: compare the remaining papers in order.
    const diff = a.paperIds.findIndex((id, i) => id !== b.paperIds[i]);
    return diff < 0 ? 0 : order.get(a.paperIds[diff]) - order.get(b.paperIds[diff]);
  });
};
