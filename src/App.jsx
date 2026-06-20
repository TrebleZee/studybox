import { useEffect, useRef, useState } from "react";
import { extractPdfText, generateSubjectDraftFromPdfText } from "./specImport.js";

const DEFAULT_SUBJECT_IDS = new Set(["physics", "maths", "further", "cs"]);
const STORAGE_KEYS = {
  subjects: "sb-subjects",
  sessions: "sb-sessions",
  theme: "sb-theme",
};

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
};

const SUBJECT_PRESETS = [
  { id: "physics", name: "Physics", exam: "OCR A", color: "#4F9CF9" },
  { id: "maths", name: "Maths", exam: "Edexcel", color: "#34D399" },
  { id: "further", name: "Further Maths", exam: "Edexcel", color: "#A78BFA" },
  { id: "cs", name: "Computer Science", exam: "OCR", color: "#FBBF24" },
];

const THEMES = [
  {
    id: "midnight",
    name: "Midnight",
    description: "The current dark palette, tuned for low-distraction study.",
    colors: {
      bg: "#0C0C0C",
      s1: "#131313",
      s2: "#1A1A1A",
      s3: "#222222",
      bdr: "#272727",
      bdr2: "#333333",
      txt: "#F0F0F0",
      muted: "#5A5A5A",
      dim: "#353535",
      hover: "rgba(255,255,255,0.04)",
    },
  },
  {
    id: "paper",
    name: "Paper",
    description: "A bright workspace with warm surfaces and soft borders.",
    colors: {
      bg: "#F5F1E8",
      s1: "#FFFCF6",
      s2: "#F1EBDE",
      s3: "#E7E0CF",
      bdr: "#DDD5C5",
      bdr2: "#CEC5B4",
      txt: "#1A1A1A",
      muted: "#6E6658",
      dim: "#B0A796",
      hover: "rgba(0,0,0,0.035)",
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Deep green surfaces with a calmer editorial feel.",
    colors: {
      bg: "#0B1410",
      s1: "#111D17",
      s2: "#17261F",
      s3: "#203129",
      bdr: "#23372E",
      bdr2: "#2D473C",
      txt: "#ECF6F1",
      muted: "#7D988B",
      dim: "#355043",
      hover: "rgba(255,255,255,0.05)",
    },
  },
  {
    id: "slate",
    name: "Slate",
    description: "Cool, balanced greys with a slightly brighter contrast.",
    colors: {
      bg: "#0E1116",
      s1: "#151A21",
      s2: "#1B212B",
      s3: "#242C38",
      bdr: "#2A3442",
      bdr2: "#394555",
      txt: "#F2F5FA",
      muted: "#7F8A99",
      dim: "#384454",
      hover: "rgba(255,255,255,0.045)",
    },
  },
];

const SESSION_TAG_SUGGESTIONS = [
  "Past papers",
  "Blurting",
  "Recap",
  "Flashcards",
  "Practice questions",
  "Timed set",
];

const fmt = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const fmtDur = (s) => {
  if (!s) return "-";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const loadJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const topicList = (seed, prefix) =>
  seed.map((name, index) => ({
    id: `${prefix}${index}`,
    name,
    done: false,
  }));

const defaultSubjects = () =>
  SUBJECT_PRESETS.map((subject) => ({
    ...subject,
    locked: true,
    custom: false,
    topics: topicList(TOPIC_SEED[subject.id] || [], subject.id.slice(0, 2)),
  }));

const normalizeSubjects = (input) => {
  if (input == null) {
    return defaultSubjects();
  }

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
      locked: DEFAULT_SUBJECT_IDS.has(subject?.id),
      custom: !DEFAULT_SUBJECT_IDS.has(subject?.id),
      topics: sourceTopics.map((topic, topicIndex) => ({
        id: topic?.id || `${subject?.id || "sub"}-${topicIndex}`,
        name: topic?.name || "Untitled topic",
        done: Boolean(topic?.done),
      })),
    };
  });
};

const normalizeSessions = (input) => {
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

const addUniqueTag = (current, nextTag) => {
  const cleaned = nextTag.trim().replace(/\s+/g, " ");
  if (!cleaned) return current;

  const exists = current.some(
    (tag) => tag.toLowerCase() === cleaned.toLowerCase()
  );
  return exists ? current : [...current, cleaned];
};

export default function StudyBox() {
  const [themeId, setThemeId] = useState(() =>
    loadJson(STORAGE_KEYS.theme, "midnight")
  );
  const [subjects, setSubjects] = useState(() =>
    normalizeSubjects(loadJson(STORAGE_KEYS.subjects, null))
  );
  const [sessions, setSessions] = useState(() =>
    normalizeSessions(loadJson(STORAGE_KEYS.sessions, []))
  );
  const [sel, setSel] = useState("physics");
  const [view, setView] = useState("planner");
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [tSub, setTSub] = useState(null);
  const [newTopic, setNewTopic] = useState("");
  const [note, setNote] = useState("");
  const [sessionTags, setSessionTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectExam, setSubjectExam] = useState("");
  const [subjectColor, setSubjectColor] = useState("#4F9CF9");
  const [specFileName, setSpecFileName] = useState("");
  const [specImporting, setSpecImporting] = useState(false);
  const [specError, setSpecError] = useState("");
  const [specTopics, setSpecTopics] = useState([]);
  const [editingSession, setEditingSession] = useState(null);
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editDurationHours, setEditDurationHours] = useState(0);
  const [editDurationMinutes, setEditDurationMinutes] = useState(0);
  const [editDate, setEditDate] = useState("");
  const [editTags, setEditTags] = useState([]);
  const [editTagInput, setEditTagInput] = useState("");
  const [editNote, setEditNote] = useState("");
  const itvRef = useRef();

  const theme = THEMES.find((item) => item.id === themeId) || THEMES[0];
  const C = theme.colors;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(themeId));
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  }, [sessions]);

  const running = startedAt !== null;

  useEffect(() => {
    if (startedAt !== null) {
      itvRef.current = setInterval(() => setNow(Date.now()), 500);
    } else {
      clearInterval(itvRef.current);
    }

    return () => clearInterval(itvRef.current);
  }, [startedAt]);

  const displaySecs = startedAt !== null ? Math.floor((now - startedAt) / 1000) : elapsed;

  useEffect(() => {
    document.title = startedAt !== null ? `${fmt(displaySecs)} · StudyBox` : "StudyBox";
  }, [startedAt, displaySecs]);

  const sub = subjects.find((subject) => subject.id === sel) || subjects[0] || null;
  const tSubData = subjects.find((subject) => subject.id === tSub);
  const currentSubjectId = sub?.id || null;
  const pct = (subject) =>
    subject.topics.length
      ? Math.round(
          (subject.topics.filter((topic) => topic.done).length /
            subject.topics.length) *
            100
        )
      : 0;
  const subTotal = (id) =>
    sessions
      .filter((session) => session.subjectId === id)
      .reduce((sum, session) => sum + session.duration, 0);
  const grandTotal = sessions.reduce((sum, session) => sum + session.duration, 0);
  const timerColor = tSubData?.color || sub?.color || "#888888";
  const toggleTopic = (sid, tid) =>
    setSubjects((prev) =>
      prev.map((subject) =>
        subject.id === sid
          ? {
              ...subject,
              topics: subject.topics.map((topic) =>
                topic.id === tid ? { ...topic, done: !topic.done } : topic
              ),
            }
          : subject
      )
    );

  const updateSubject = (id, patch) => {
    setSubjects((prev) =>
      prev.map((subject) => (subject.id === id ? { ...subject, ...patch } : subject))
    );
  };

  const addTopic = () => {
    const topicName = newTopic.trim();
    if (!topicName || !sub) return;

    setSubjects((prev) =>
      prev.map((subject) =>
        subject.id === currentSubjectId
          ? {
              ...subject,
              topics: [
                ...subject.topics,
                { id: Date.now().toString(), name: topicName, done: false },
              ],
            }
          : subject
      )
    );
    setNewTopic("");
  };

  const delTopic = (tid) =>
    setSubjects((prev) =>
      prev.map((subject) =>
        subject.id === currentSubjectId
          ? { ...subject, topics: subject.topics.filter((topic) => topic.id !== tid) }
          : subject
      )
    );

  const addSubject = () => {
    const cleanName = subjectName.trim();
    const cleanExam = subjectExam.trim();
    if (!cleanName) return;

    const id = `custom-${Date.now().toString(36)}`;
    setSubjects((prev) => [
      ...prev,
      {
        id,
        name: cleanName,
        exam: cleanExam || "Custom",
        color: subjectColor,
        locked: false,
        custom: true,
        topics: specTopics.map((topic, i) => ({
          id: `${id}-topic-${i}`,
          name: topic,
          done: false,
        })),
      },
    ]);
    setSel(id);
    setSubjectName("");
    setSubjectExam("");
    setSubjectColor("#4F9CF9");
    setSpecFileName("");
    setSpecError("");
    setSpecTopics([]);
  };

  const handleSpecUpload = async (file) => {
    if (!file) return;

    setSpecImporting(true);
    setSpecError("");
    setSpecFileName(file.name);

    try {
      const text = await extractPdfText(file);
      const draft = generateSubjectDraftFromPdfText(text, file.name);

      setSubjectName(draft.subjectName);
      setSubjectExam(draft.examBoard);
      setSpecTopics(draft.topics || []);
    } catch (error) {
      setSpecError(error instanceof Error ? error.message : "Unable to read PDF spec.");
    } finally {
      setSpecImporting(false);
    }
  };

  const clearSpecImport = () => {
    setSpecFileName("");
    setSpecError("");
    setSpecTopics([]);
  };

  const removeSubject = (id) => {
    const next = subjects.filter((subject) => subject.id !== id);
    setSubjects(next);
    if (sel === id) {
      setSel(next[0]?.id || null);
    }
    if (tSub === id) {
      setTSub(null);
    }
  };

  const addTag = (raw) => {
    const next = raw.trim();
    if (!next) return;
    setSessionTags((prev) => addUniqueTag(prev, next));
    setTagDraft("");
  };

  const removeTag = (tag) => {
    setSessionTags((prev) => prev.filter((item) => item !== tag));
  };

  const clearTags = () => setSessionTags([]);

  const start = () => {
    if (!sub) return;
    if (!tSub) setTSub(currentSubjectId);
    setStartedAt(Date.now() - elapsed * 1000);
  };

  const pause = () => {
    setElapsed(displaySecs);
    setStartedAt(null);
  };

  const reset = () => {
    setElapsed(0);
    setStartedAt(null);
    setTSub(null);
  };

  const logSess = () => {
    if (!displaySecs || !sub) return;

    const subjectToLog = tSubData || sub;
    const nid = `sess-${Date.now().toString(36)}`;
    setSessions((prev) => [
      {
        id: nid,
        subjectId: subjectToLog.id,
        subjectName: subjectToLog.name,
        subjectColor: subjectToLog.color,
        duration: displaySecs,
        date: new Date().toISOString(),
        note: note.trim(),
        tags: sessionTags,
      },
      ...prev,
    ]);

    setNote("");
    clearTags();
    reset();
  };

  const deleteSession = (id) => {
    setSessions((prev) => prev.filter((session) => session.id !== id));
  };

  const startEditSession = (session) => {
    setEditingSession(session);
    setEditSubjectId(session.subjectId);
    setEditDurationHours(Math.floor(session.duration / 3600));
    setEditDurationMinutes(Math.floor((session.duration % 3600) / 60));

    const d = new Date(session.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setEditDate(`${yyyy}-${mm}-${dd}`);

    setEditTags(session.tags || []);
    setEditTagInput("");
    setEditNote(session.note || "");
  };

  const saveEditSession = () => {
    if (!editingSession) return;

    const targetSubject = subjects.find((s) => s.id === editSubjectId) || {
      id: editSubjectId,
      name: editingSession.subjectName,
      color: editingSession.subjectColor,
    };

    const totalSeconds = editDurationHours * 3600 + editDurationMinutes * 60;

    let finalDate = editingSession.date;
    if (editDate) {
      const originalDate = new Date(editingSession.date);
      const [y, m, d] = editDate.split("-").map(Number);
      const newD = new Date(
        y,
        m - 1,
        d,
        originalDate.getHours(),
        originalDate.getMinutes(),
        originalDate.getSeconds()
      );
      finalDate = newD.toISOString();
    }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === editingSession.id
          ? {
              ...s,
              subjectId: targetSubject.id,
              subjectName: targetSubject.name,
              subjectColor: targetSubject.color,
              duration: totalSeconds,
              date: finalDate,
              tags: editTags,
              note: editNote.trim(),
            }
          : s
      )
    );

    setEditingSession(null);
  };

  const CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${C.bdr2}; border-radius: 3px; }
    input, textarea { font-family: inherit; font-size: 13px; }
    input::placeholder, textarea::placeholder { color: ${C.muted}; }
    .sub-btn:hover { background: ${C.hover} !important; }
    .topic-row:hover { background: ${C.s2} !important; }
    .topic-row:hover .del { opacity: 0.5 !important; }
    .del:hover { opacity: 1 !important; color: ${C.txt} !important; }
    .nb:hover { opacity: 0.85; }
    .nb:active { transform: scale(0.97); }
    .sess-row:hover .del-sess { opacity: 0.6 !important; }
    .sess-row:hover .edit-sess { opacity: 0.6 !important; }
    .edit-sess:hover { opacity: 1 !important; color: ${C.txt} !important; background: ${C.s3} !important; }
    .del-sess:hover { opacity: 1 !important; color: #f87171 !important; }
    .theme-card:hover { background: ${C.hover} !important; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .ticking { animation: blink 2s ease-in-out infinite; }
  `;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: C.bg,
        color: C.txt,
        fontFamily: '"Inter", system-ui, sans-serif',
        fontSize: "13px",
        overflow: "hidden",
      }}
    >
      <style>{CSS}</style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          height: "46px",
          borderBottom: `1px solid ${C.bdr}`,
          background: C.s1,
          gap: "3px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: "14px",
            letterSpacing: "-0.3px",
            marginRight: "10px",
            color: C.txt,
          }}
        >
          StudyBox
        </span>
        {[
          ["planner", "Planner"],
          ["log", "Log"],
          ["settings", "Settings"],
        ].map(([v, label]) => (
          <button
            key={v}
            className="nb"
            onClick={() => setView(v)}
            style={{
              padding: "5px 11px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
              background: view === v ? C.s3 : "transparent",
              color: view === v ? C.txt : C.muted,
              transition: "background 0.1s",
            }}
          >
            {label}
          </button>
        ))}
        {grandTotal > 0 && (
          <span style={{ marginLeft: "auto", fontSize: "11px", color: C.muted }}>
            {fmtDur(grandTotal)} total
          </span>
        )}
      </div>

      {view === "planner" && (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div
            style={{
              width: "188px",
              borderRight: `1px solid ${C.bdr}`,
              background: C.s1,
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "11px 13px 5px",
                fontSize: "10px",
                fontWeight: 600,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Subjects
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  className="sub-btn"
                  type="button"
                  onClick={() => setSel(subject.id)}
                  aria-label={subject.name}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    padding: "9px 13px",
                    cursor: "pointer",
                    background:
                      sel === subject.id ? `${subject.color}18` : "transparent",
                    borderLeft: `3px solid ${
                      sel === subject.id ? subject.color : "transparent"
                    }`,
                    transition: "background 0.1s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: "1px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "12px",
                        color: sel === subject.id ? subject.color : C.txt,
                      }}
                    >
                      {subject.name}
                    </span>
                    <span style={{ fontSize: "10px", color: C.muted }}>
                      {pct(subject)}%
                    </span>
                  </div>
                  <div style={{ fontSize: "10px", color: C.muted, marginBottom: "5px" }}>
                    {subject.exam}
                  </div>
                  <div
                    style={{
                      height: "2px",
                      background: C.bdr2,
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct(subject)}%`,
                        background: subject.color,
                        borderRadius: "2px",
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
            <div style={{ padding: "10px 13px", borderTop: `1px solid ${C.bdr}` }}>
              <div style={{ fontSize: "10px", color: C.muted, marginBottom: "2px" }}>
                Total study time
              </div>
              <div style={{ fontSize: "17px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {fmtDur(grandTotal)}
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            {sub && (
              <>
                <div
                  style={{
                    padding: "11px 16px",
                    borderBottom: `1px solid ${C.bdr}`,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: sub.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 700, fontSize: "14px" }}>{sub.name}</span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: C.muted,
                      padding: "2px 7px",
                      background: C.s2,
                      borderRadius: "4px",
                      border: `1px solid ${C.bdr2}`,
                    }}
                  >
                    {sub.exam}
                  </span>
                  <span style={{ fontSize: "11px", color: C.muted, marginLeft: "auto" }}>
                    {sub.topics.filter((topic) => topic.done).length}/{sub.topics.length} done
                    {" · "}
                    {fmtDur(subTotal(sub.id))} logged
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {sub.topics.length === 0 && (
                    <div
                      style={{
                        padding: "40px 16px",
                        textAlign: "center",
                        color: C.muted,
                        fontSize: "12px",
                      }}
                    >
                      No topics yet. Add one below.
                    </div>
                  )}
                  {sub.topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="topic-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "7px 16px",
                        gap: "10px",
                        transition: "background 0.1s",
                        background: "transparent",
                      }}
                    >
                      <div
                        onClick={() => toggleTopic(sub.id, topic.id)}
                        style={{
                          width: "15px",
                          height: "15px",
                          borderRadius: "4px",
                          flexShrink: 0,
                          border: `1.5px solid ${topic.done ? sub.color : C.dim}`,
                          background: topic.done ? sub.color : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {topic.done && (
                          <svg
                            width="9"
                            height="7"
                            viewBox="0 0 9 7"
                            fill="none"
                          >
                            <path
                              d="M1 3.5l2.5 2.5 4.5-5"
                              stroke="#000"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        style={{
                          flex: 1,
                          color: topic.done ? C.muted : C.txt,
                          textDecoration: topic.done ? "line-through" : "none",
                          fontSize: "13px",
                        }}
                      >
                        {topic.name}
                      </span>
                      <button
                        className="del nb"
                        onClick={() => delTopic(topic.id)}
                        aria-label={`Delete topic ${topic.name}`}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: C.muted,
                          cursor: "pointer",
                          fontSize: "17px",
                          lineHeight: 1,
                          opacity: 0,
                          transition: "opacity 0.1s",
                          padding: "0 2px",
                        }}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    padding: "9px 16px",
                    borderTop: `1px solid ${C.bdr}`,
                    display: "flex",
                    gap: "6px",
                    flexShrink: 0,
                  }}
                >
                  <input
                    style={{
                      flex: 1,
                      background: C.s2,
                      border: `1px solid ${C.bdr2}`,
                      borderRadius: "6px",
                      padding: "7px 10px",
                      color: C.txt,
                      outline: "none",
                    }}
                    placeholder={`Add topic to ${sub.name}...`}
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTopic()}
                  />
                  <button
                    className="nb"
                    onClick={addTopic}
                    aria-label="Add topic"
                    style={{
                      padding: "7px 14px",
                      background: sub.color,
                      border: "none",
                      borderRadius: "6px",
                      color: "#000",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </button>
                </div>
              </>
            )}
          </div>

          <div
            style={{
              width: "250px",
              borderLeft: `1px solid ${C.bdr}`,
              background: C.s1,
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "11px 13px 8px",
                fontSize: "10px",
                fontWeight: 600,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "1px",
                borderBottom: `1px solid ${C.bdr}`,
              }}
            >
              Timer
            </div>
            <div style={{ padding: "18px 13px 12px", textAlign: "center" }}>
              <div
                className={running ? "ticking" : ""}
                style={{
                  fontSize: "40px",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-2px",
                  color: timerColor,
                  lineHeight: 1,
                }}
              >
                {fmt(displaySecs)}
              </div>
              <div style={{ fontSize: "11px", color: C.muted, marginTop: "5px", height: "14px" }}>
                {tSubData ? tSubData.name : sub?.name || "-"}
              </div>
            </div>
            <div style={{ display: "flex", gap: "5px", padding: "0 13px", marginBottom: "8px" }}>
              {!running ? (
                <button
                  className="nb"
                  onClick={start}
                  disabled={!sub}
                  style={{
                    flex: 2,
                    padding: "8px 0",
                    borderRadius: "6px",
                    border: "none",
                    cursor: sub ? "pointer" : "not-allowed",
                    fontWeight: 700,
                    fontSize: "12px",
                    background: sub ? timerColor : C.s3,
                    color: sub ? "#000" : C.muted,
                  }}
                >
                  {displaySecs > 0 ? "Resume" : "Start"}
                </button>
              ) : (
                <button
                  className="nb"
                  onClick={pause}
                  style={{
                    flex: 2,
                    padding: "8px 0",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "12px",
                    background: timerColor,
                    color: "#000",
                  }}
                >
                  Pause
                </button>
              )}
              <button
                className="nb"
                onClick={reset}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "12px",
                  background: C.s3,
                  color: C.muted,
                }}
              >
                Reset
              </button>
            </div>
            <textarea
              rows={2}
              placeholder="Session note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                margin: "0 13px 8px",
                background: C.s2,
                border: `1px solid ${C.bdr2}`,
                borderRadius: "6px",
                padding: "7px 9px",
                color: C.txt,
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
                fontSize: "12px",
                lineHeight: 1.5,
              }}
            />

            <div style={{ padding: "0 13px 8px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Session Tags
                </span>
                <button
                  className="nb"
                  onClick={clearTags}
                  disabled={!sessionTags.length}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: sessionTags.length ? C.txt : C.muted,
                    cursor: sessionTags.length ? "pointer" : "not-allowed",
                    fontSize: "11px",
                    padding: 0,
                  }}
                >
                  Clear
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {sessionTags.length === 0 ? (
                  <span style={{ color: C.muted, fontSize: "11px", lineHeight: 1.5 }}>
                    Add tags like past papers, blurting, or recap.
                  </span>
                ) : (
                  sessionTags.map((tag) => (
                    <button
                      key={tag}
                      className="nb"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      style={{
                        border: `1px solid ${C.bdr2}`,
                        background: C.s2,
                        color: C.txt,
                        borderRadius: "999px",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: "11px",
                      }}
                    >
                      {tag} x
                    </button>
                  ))
                )}
              </div>

              <div style={{ display: "flex", gap: "5px", marginTop: "8px" }}>
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag(tagDraft);
                    }
                  }}
                  placeholder="Add tag"
                  style={{
                    flex: 1,
                    background: C.s2,
                    border: `1px solid ${C.bdr2}`,
                    borderRadius: "6px",
                    padding: "7px 9px",
                    color: C.txt,
                    outline: "none",
                  }}
                />
                <button
                  className="nb"
                  onClick={() => addTag(tagDraft)}
                  aria-label="Add session tag"
                  style={{
                    padding: "7px 11px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "12px",
                    background: C.s3,
                    color: C.txt,
                  }}
                >
                  Add
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "8px" }}>
                {SESSION_TAG_SUGGESTIONS.map((tag) => (
                  <button
                    key={tag}
                    className="nb"
                    onClick={() => setSessionTags((prev) => addUniqueTag(prev, tag))}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "999px",
                      border: `1px solid ${C.bdr2}`,
                      background: C.s2,
                      color: C.muted,
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="nb"
              onClick={logSess}
              disabled={!displaySecs || !sub}
              style={{
                margin: "0 13px 13px",
                padding: "9px 0",
                background: displaySecs && sub ? timerColor : C.s3,
                border: "none",
                borderRadius: "6px",
                color: displaySecs && sub ? "#000" : C.muted,
                fontWeight: 700,
                fontSize: "12px",
                cursor: displaySecs && sub ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
            >
              Log Session
            </button>

            <div
              style={{
                padding: "6px 13px 4px",
                fontSize: "10px",
                fontWeight: 600,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Hours by Subject
            </div>
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: "8px" }}>
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "5px 13px",
                    gap: "7px",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: subject.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: "12px",
                      color: subject.id === currentSubjectId ? subject.color : C.txt,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {subject.name}
                  </span>
                  <span style={{ fontSize: "11px", color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                    {fmtDur(subTotal(subject.id))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "log" && (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div
            style={{
              width: "188px",
              borderRight: `1px solid ${C.bdr}`,
              background: C.s1,
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "11px 13px 8px",
                fontSize: "10px",
                fontWeight: 600,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Overview
            </div>
            <div style={{ padding: "0 13px 12px", borderBottom: `1px solid ${C.bdr}` }}>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  letterSpacing: "-1px",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtDur(grandTotal)}
              </div>
              <div style={{ fontSize: "11px", color: C.muted, marginTop: "3px" }}>
                {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div
              style={{
                padding: "9px 13px 4px",
                fontSize: "10px",
                fontWeight: 600,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              By Subject
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "3px 0 8px" }}>
              {[...subjects]
                .sort((a, b) => subTotal(b.id) - subTotal(a.id))
                .map((subject) => {
                  const total = subTotal(subject.id);
                  const max = Math.max(...subjects.map((item) => subTotal(item.id)), 1);

                  return (
                    <div key={subject.id} style={{ padding: "5px 13px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "3px",
                        }}
                      >
                        <span style={{ fontSize: "12px", fontWeight: 500, color: C.txt }}>
                          {subject.name}
                        </span>
                        <span style={{ fontSize: "11px", color: C.muted }}>
                          {fmtDur(total)}
                        </span>
                      </div>
                      <div
                        style={{
                          height: "3px",
                          background: C.bdr2,
                          borderRadius: "2px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${(total / max) * 100}%`,
                            background: subject.color,
                            borderRadius: "2px",
                            transition: "width 0.4s",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "10px",
              }}
            >
              Session History
            </div>
            {sessions.length === 0 ? (
              <div style={{ textAlign: "center", color: C.muted, padding: "60px 0" }}>
                <div style={{ fontSize: "28px", marginBottom: "8px", opacity: 0.4 }}>
                  ⏱
                </div>
                <div style={{ fontSize: "13px" }}>No sessions yet.</div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>
                  Start the timer and log your first session.
                </div>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="sess-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "11px",
                    padding: "10px 13px",
                    background: C.s2,
                    borderRadius: "8px",
                    marginBottom: "5px",
                    border: `1px solid ${C.bdr}`,
                  }}
                >
                  <div
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: session.subjectColor,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "13px" }}>
                      {session.subjectName}
                    </div>
                    {session.note && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: C.muted,
                          marginTop: "2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {session.note}
                      </div>
                    )}
                    {session.tags?.length ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                        {session.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: "10px",
                              padding: "3px 7px",
                              borderRadius: "999px",
                              border: `1px solid ${C.bdr2}`,
                              background: C.s1,
                              color: C.muted,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "14px",
                        color: session.subjectColor,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtDur(session.duration)}
                    </div>
                    <div style={{ fontSize: "11px", color: C.muted }}>
                      {fmtDate(session.date)}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <button
                      className="edit-sess nb"
                      onClick={() => startEditSession(session)}
                      aria-label={`Edit session ${session.subjectName}`}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: C.muted,
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: 500,
                        opacity: 0,
                        transition: "opacity 0.1s",
                        padding: "4px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="del-sess nb"
                      onClick={() => deleteSession(session.id)}
                      aria-label={`Delete session ${session.subjectName}`}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: C.muted,
                        cursor: "pointer",
                        fontSize: "17px",
                        lineHeight: 1,
                        opacity: 0,
                        transition: "opacity 0.1s",
                        padding: "0 2px",
                        flexShrink: 0,
                      }}
                    >
                      x
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {view === "settings" && (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div
            style={{
              width: "228px",
              borderRight: `1px solid ${C.bdr}`,
              background: C.s1,
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "11px 13px 8px",
                fontSize: "10px",
                fontWeight: 600,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Themes
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
              {THEMES.map((candidate) => {
                const active = candidate.id === themeId;
                return (
                  <button
                    key={candidate.id}
                    className="theme-card nb"
                    onClick={() => setThemeId(candidate.id)}
                    aria-pressed={active}
                    data-theme={candidate.id}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "block",
                      border: `1px solid ${active ? candidate.colors.s3 : C.bdr}`,
                      background: active ? C.s2 : "transparent",
                      color: C.txt,
                      borderRadius: "10px",
                      padding: "10px",
                      marginBottom: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        marginBottom: "8px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "13px" }}>
                          {candidate.name}
                        </div>
                        <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>
                          {candidate.description}
                        </div>
                      </div>
                      {active ? (
                        <span
                          style={{
                            fontSize: "10px",
                            color: C.txt,
                            border: `1px solid ${C.bdr2}`,
                            background: C.s3,
                            borderRadius: "999px",
                            padding: "3px 7px",
                          }}
                        >
                          Active
                        </span>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {[
                        candidate.colors.bg,
                        candidate.colors.s1,
                        candidate.colors.s2,
                        candidate.colors.txt,
                      ].map((swatch) => (
                        <div
                          key={swatch}
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "5px",
                            background: swatch,
                            border: `1px solid ${C.bdr2}`,
                          }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.3fr) minmax(180px, 1fr)",
                gap: "12px",
              }}
            >
              <div
                style={{
                  background: C.s1,
                  border: `1px solid ${C.bdr}`,
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "10px",
                  }}
                >
                  Add Subject
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr) 52px auto",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <input
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="Subject name"
                    style={{
                      background: C.s2,
                      border: `1px solid ${C.bdr2}`,
                      borderRadius: "8px",
                      padding: "9px 10px",
                      color: C.txt,
                      outline: "none",
                    }}
                  />
                  <input
                    value={subjectExam}
                    onChange={(e) => setSubjectExam(e.target.value)}
                    placeholder="Exam board"
                    style={{
                      background: C.s2,
                      border: `1px solid ${C.bdr2}`,
                      borderRadius: "8px",
                      padding: "9px 10px",
                      color: C.txt,
                      outline: "none",
                    }}
                  />
                  <input
                    type="color"
                    value={subjectColor}
                    onChange={(e) => setSubjectColor(e.target.value)}
                    title="Subject colour"
                    style={{
                      width: "52px",
                      height: "38px",
                      padding: 0,
                      border: `1px solid ${C.bdr2}`,
                      borderRadius: "8px",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  />
                  <button
                    className="nb"
                    onClick={addSubject}
                    aria-label="Create subject"
                    style={{
                      padding: "9px 14px",
                      borderRadius: "8px",
                      border: "none",
                      background: subjectColor,
                      color: "#000",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </button>
                </div>
                <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {SUBJECT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      className="nb"
                      onClick={() => {
                        setSubjectName(preset.name);
                        setSubjectExam(preset.exam);
                        setSubjectColor(preset.color);
                      }}
                      style={{
                        border: `1px solid ${C.bdr2}`,
                        background: C.s2,
                        color: C.txt,
                        borderRadius: "999px",
                        padding: "5px 9px",
                        cursor: "pointer",
                        fontSize: "11px",
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    borderRadius: "10px",
                    border: `1px solid ${C.bdr}`,
                    background: C.s2,
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: C.muted,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginBottom: "8px",
                    }}
                  >
                    Import Spec PDF
                  </div>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    aria-label="Import subject specification PDF"
                    onChange={(e) => handleSpecUpload(e.target.files?.[0])}
                    style={{
                      width: "100%",
                      color: C.muted,
                      fontSize: "12px",
                    }}
                  />
                  <div style={{ marginTop: "8px", color: C.muted, fontSize: "11px", lineHeight: 1.5 }}>
                    Upload a specification PDF to auto-fill the subject name and exam board.
                  </div>
                  {specImporting && (
                    <div style={{ marginTop: "8px", fontSize: "11px", color: C.txt }}>
                      Reading PDF...
                    </div>
                  )}
                  {!specImporting && specFileName && !specError && (
                    <div style={{ marginTop: "8px", fontSize: "11px", color: C.txt }}>
                      Loaded {specFileName}.
                      {specTopics.length > 0 && (
                        <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {specTopics.map((topic, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: C.s3,
                                color: C.txt,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "10px",
                              }}
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {specError && (
                    <div style={{ marginTop: "8px", fontSize: "11px", color: "#f87171" }}>
                      {specError}
                    </div>
                  )}
                  {specFileName && (
                    <button
                      className="nb"
                      type="button"
                      onClick={clearSpecImport}
                      style={{
                        marginTop: "10px",
                        border: "none",
                        background: "transparent",
                        color: C.txt,
                        cursor: "pointer",
                        fontSize: "11px",
                        padding: 0,
                      }}
                      >
                      Clear imported PDF
                    </button>
                  )}
                </div>
              </div>

              <div
                style={{
                  background: C.s1,
                  border: `1px solid ${C.bdr}`,
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "10px",
                  }}
                >
                  Edit Subjects
                </div>
                <div style={{ color: C.muted, fontSize: "12px", lineHeight: 1.5, marginBottom: "12px" }}>
                  Edit the built-in subjects directly or delete any subject you no longer want.
                </div>
                {subjects.length === 0 ? (
                  <div style={{ color: C.muted, fontSize: "12px", lineHeight: 1.5 }}>
                    No subjects yet. Add one on the left to get started again.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {subjects.map((subject) => (
                      <div
                        key={subject.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto minmax(0, 1fr) 52px auto",
                          gap: "10px",
                          alignItems: "center",
                          padding: "10px 11px",
                          borderRadius: "10px",
                          background: C.s2,
                          border: `1px solid ${C.bdr}`,
                        }}
                      >
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: subject.color,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ display: "grid", gap: "6px", minWidth: 0 }}>
                          <input
                            aria-label={`Subject name ${subject.id}`}
                            value={subject.name}
                            onChange={(e) => updateSubject(subject.id, { name: e.target.value })}
                            style={{
                              width: "100%",
                              background: C.s1,
                              border: `1px solid ${C.bdr2}`,
                              borderRadius: "8px",
                              padding: "8px 9px",
                              color: C.txt,
                              outline: "none",
                            }}
                          />
                          <input
                            aria-label={`Subject exam ${subject.id}`}
                            value={subject.exam}
                            onChange={(e) => updateSubject(subject.id, { exam: e.target.value })}
                            style={{
                              width: "100%",
                              background: C.s1,
                              border: `1px solid ${C.bdr2}`,
                              borderRadius: "8px",
                              padding: "8px 9px",
                              color: C.txt,
                              outline: "none",
                            }}
                          />
                        </div>
                        <input
                          type="color"
                          aria-label={`Subject colour ${subject.id}`}
                          value={subject.color}
                          onChange={(e) => updateSubject(subject.id, { color: e.target.value })}
                          style={{
                            width: "52px",
                            height: "38px",
                            padding: 0,
                            border: `1px solid ${C.bdr2}`,
                            borderRadius: "8px",
                            background: "transparent",
                            cursor: "pointer",
                          }}
                        />
                        <button
                          className="nb"
                          onClick={() => removeSubject(subject.id)}
                          aria-label={`Delete subject ${subject.id}`}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: C.muted,
                            cursor: "pointer",
                            fontSize: "17px",
                            lineHeight: 1,
                            padding: "0 2px",
                            flexShrink: 0,
                          }}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: "12px",
                background: C.s1,
                border: `1px solid ${C.bdr}`,
                borderRadius: "12px",
                padding: "14px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: "10px",
                }}
              >
                What changes with themes
              </div>
              <div style={{ color: C.muted, fontSize: "12px", lineHeight: 1.6 }}>
                Themes update the app surfaces, borders, and contrast. Subject colours stay
                separate so you can keep subjects visually distinct while switching the
                overall feel of the app.
              </div>
            </div>
          </div>
        </div>
      )}
      {editingSession && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: C.s1,
              border: `1px solid ${C.bdr}`,
              borderRadius: "16px",
              padding: "20px",
              width: "100%",
              maxWidth: "380px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "14px" }}>Edit Study Session</span>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: C.muted,
                  cursor: "pointer",
                  fontSize: "18px",
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* Subject Select */}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label
                htmlFor="edit-subject-select"
                style={{ fontSize: "10px", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}
              >
                Subject
              </label>
              <select
                id="edit-subject-select"
                value={editSubjectId}
                onChange={(e) => setEditSubjectId(e.target.value)}
                style={{
                  width: "100%",
                  background: C.s2,
                  color: C.txt,
                  border: `1px solid ${C.bdr2}`,
                  borderRadius: "8px",
                  padding: "8px 10px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} {sub.exam ? `(${sub.exam})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "10px", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Duration
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    min="0"
                    value={editDurationHours}
                    onChange={(e) => setEditDurationHours(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{
                      width: "100%",
                      background: C.s2,
                      color: C.txt,
                      border: `1px solid ${C.bdr2}`,
                      borderRadius: "8px",
                      padding: "8px 10px",
                      outline: "none",
                    }}
                  />
                  <div style={{ fontSize: "9px", color: C.muted, marginTop: "2px" }}>Hours</div>
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={editDurationMinutes}
                    onChange={(e) => setEditDurationMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    style={{
                      width: "100%",
                      background: C.s2,
                      color: C.txt,
                      border: `1px solid ${C.bdr2}`,
                      borderRadius: "8px",
                      padding: "8px 10px",
                      outline: "none",
                    }}
                  />
                  <div style={{ fontSize: "9px", color: C.muted, marginTop: "2px" }}>Minutes</div>
                </div>
              </div>
            </div>

            {/* Date Picker */}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label
                htmlFor="edit-date-input"
                style={{ fontSize: "10px", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}
              >
                Date
              </label>
              <input
                id="edit-date-input"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                style={{
                  width: "100%",
                  background: C.s2,
                  color: C.txt,
                  border: `1px solid ${C.bdr2}`,
                  borderRadius: "8px",
                  padding: "8px 10px",
                  outline: "none",
                }}
              />
            </div>

            {/* Tags list and entry */}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "10px", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Tags (Press Enter to add)
              </label>
              <div
                style={{
                  border: `1px solid ${C.bdr2}`,
                  background: C.s2,
                  borderRadius: "8px",
                  padding: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {editTags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {editTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: C.s3,
                          color: C.txt,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setEditTags(editTags.filter((t) => t !== tag))}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: C.muted,
                            cursor: "pointer",
                            padding: 0,
                            fontSize: "12px",
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    placeholder="Add tag..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const tag = editTagInput.trim();
                        if (tag && !editTags.includes(tag)) {
                          setEditTags([...editTags, tag]);
                        }
                        setEditTagInput("");
                      }
                    }}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      color: C.txt,
                      outline: "none",
                      fontSize: "12px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const tag = editTagInput.trim();
                      if (tag && !editTags.includes(tag)) {
                        setEditTags([...editTags, tag]);
                      }
                      setEditTagInput("");
                    }}
                    style={{
                      background: C.s3,
                      border: `1px solid ${C.bdr2}`,
                      borderRadius: "4px",
                      padding: "2px 8px",
                      color: C.txt,
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Note text field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "10px", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Note
              </label>
              <input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Optional session notes"
                style={{
                  width: "100%",
                  background: C.s2,
                  color: C.txt,
                  border: `1px solid ${C.bdr2}`,
                  borderRadius: "8px",
                  padding: "8px 10px",
                  outline: "none",
                }}
              />
            </div>

            {/* Save / Cancel buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${C.bdr2}`,
                  background: "transparent",
                  color: C.txt,
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditSession}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: subjects.find((s) => s.id === editSubjectId)?.color || "#4F9CF9",
                  color: "#000",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
