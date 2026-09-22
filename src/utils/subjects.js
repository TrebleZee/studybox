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
// by an explicit choice in Onboarding.
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
    description: "English, Maths and Combined Science with sample GCSE topics.",
    presets: GCSE_PRESETS,
  },
];

export const topicList = (seed, prefix) =>
  seed.map((name, index) => ({
    id: `${prefix}${index}`,
    name,
    done: false,
    subtasks: [],
  }));

const subjectsFromPresets = (presets) =>
  presets.map((subject) => ({
    ...subject,
    topics: topicList(TOPIC_SEED[subject.id] || [], subject.id.slice(0, 2)),
  }));

export const defaultSubjects = () => subjectsFromPresets(ALEVEL_PRESETS);

export const subjectsForTemplate = (templateId) => {
  const template = TEMPLATES.find((item) => item.id === templateId);
  return template ? subjectsFromPresets(template.presets) : [];
};

export const isUntouchedDefaultSubjects = (subjects) =>
  JSON.stringify(subjects) === JSON.stringify(defaultSubjects());

export const normalizeSubjects = (input) => {
  if (!Array.isArray(input)) {
    return defaultSubjects();
  }

  return input.map((subject, index) => {
    const preset = SUBJECT_PRESETS.find((item) => item.id === subject?.id);
    const sourceTopics = Array.isArray(subject?.topics) ? subject.topics : [];

    return {
      id: subject?.id || `sub-${Date.now().toString(36)}-${index}`,
      name: subject?.name || preset?.name || "Untitled subject",
      exam: subject?.exam || preset?.exam || "Custom",
      color: subject?.color || preset?.color || "#4F9CF9",
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
      })),
    };
  });
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

export const subjectProgress = (subject) =>
  subject.topics.length
    ? Math.round(
        (subject.topics.filter((topic) => topic.done).length / subject.topics.length) * 100
      )
    : 0;
