import { useEffect, useRef, useState } from "react";
import AnalysisPanel from "./components/AnalysisPanel.jsx";
import EditSessionModal from "./components/EditSessionModal.jsx";
import LogView from "./components/LogView.jsx";
import Onboarding from "./components/Onboarding.jsx";
import PlannerView from "./components/PlannerView.jsx";
import SettingsView from "./components/SettingsView.jsx";
import TopBar from "./components/TopBar.jsx";
import useMilestoneReminder from "./hooks/useMilestoneReminder.js";
import useStreakReminder from "./hooks/useStreakReminder.js";
import useTimer from "./hooks/useTimer.js";
import { normalizeAsanaConfig } from "./services/asanaClient.js";
import { buildCss } from "./utils/appCss.js";
import { backupFileName, buildBackup, parseBackup } from "./utils/backup.js";
import { fmt } from "./utils/format.js";
import {
  applyLoggedSession,
  buildInitialGame,
  streakExpiry,
  validateStreak,
} from "./utils/gameLogic.js";
import { loadJson, STORAGE_KEYS } from "./utils/storage.js";
import {
  addUniqueTag,
  isUntouchedDefaultSubjects,
  normalizeSessions,
  normalizeSubject,
  normalizeSubjects,
  updateSubjectFields,
} from "./utils/subjects.js";
import { subjectsForTemplate } from "./utils/catalogue.js";
import { convertTopicToMilestone } from "./utils/milestones.js";
import { THEMES } from "./utils/themes.js";

const readFileText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Unable to read backup file."));
    reader.readAsText(file);
  });

const mapSubject = (subjects, id, fn) =>
  subjects.map((subject) => (subject.id === id ? fn(subject) : subject));

export default function StudyBox() {
  const [themeId, setThemeId] = useState(() => loadJson(STORAGE_KEYS.theme, "midnight"));
  const [subjects, setSubjects] = useState(() =>
    normalizeSubjects(loadJson(STORAGE_KEYS.subjects, null))
  );
  const [sessions, setSessions] = useState(() =>
    normalizeSessions(loadJson(STORAGE_KEYS.sessions, []))
  );
  const [asanaCfg, setAsanaCfg] = useState(() =>
    normalizeAsanaConfig(loadJson(STORAGE_KEYS.asana, null))
  );
  const [asanaStats, setAsanaStats] = useState(() => loadJson(STORAGE_KEYS.asanaStats, null));
  const [game, setGame] = useState(() =>
    buildInitialGame(
      loadJson(STORAGE_KEYS.game, null),
      normalizeSessions(loadJson(STORAGE_KEYS.sessions, [])),
      normalizeSubjects(loadJson(STORAGE_KEYS.subjects, null))
    )
  );
  const [onboarded, setOnboarded] = useState(() => loadJson(STORAGE_KEYS.onboarded, false));
  const templateRequest = useRef(0);
  const [sel, setSel] = useState(() => subjects[0]?.id ?? null);
  const [view, setView] = useState("planner");
  const [asanaTask, setAsanaTask] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [note, setNote] = useState("");
  const [sessionTags, setSessionTags] = useState([]);
  const [editingSession, setEditingSession] = useState(null);
  const [backupMessage, setBackupMessage] = useState(null);

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
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.asana, JSON.stringify(asanaCfg));
  }, [asanaCfg]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.asanaStats, JSON.stringify(asanaStats));
  }, [asanaStats]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.game, JSON.stringify(game));
  }, [game]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.onboarded, JSON.stringify(onboarded));
  }, [onboarded]);

  // Re-validate when the persisted streak window expires while the app is open;
  // buildInitialGame runs the same validator on launch.
  useEffect(() => {
    if (!game.lastStudyDate || game.currentStreak <= 0) return undefined;

    const nextCheckAt = Math.max(
      streakExpiry(game.lastStudyDate),
      Number(game.streakProtectedUntil) || 0
    );
    const timeout = setTimeout(
      () => setGame((current) => validateStreak(current, Date.now())),
      Math.max(0, nextCheckAt - Date.now())
    );
    return () => clearTimeout(timeout);
  }, [game.currentStreak, game.freezesUsed, game.lastStudyDate, game.streakProtectedUntil]);

  const sub = subjects.find((subject) => subject.id === sel) || subjects[0] || null;
  const asanaEnabled = asanaCfg.enabled;
  const asanaSelected = asanaEnabled && sel === asanaCfg.id;
  const asanaPct =
    asanaStats && asanaStats.total > 0
      ? Math.round((asanaStats.completed / asanaStats.total) * 100)
      : null;
  const canTime = asanaSelected || Boolean(sub);

  const timer = useTimer({
    canTime,
    defaultSubjectId: asanaSelected ? asanaCfg.id : sub?.id ?? null,
  });
  useStreakReminder(game);
  useMilestoneReminder(subjects);
  const { running, displaySecs, timedSubjectId } = timer;
  const timedSubject = subjects.find((subject) => subject.id === timedSubjectId);
  const timingAsana = asanaEnabled && timedSubjectId === asanaCfg.id;

  useEffect(() => {
    document.title = running ? `${fmt(displaySecs)} · StudyBox` : "StudyBox";
  }, [running, displaySecs]);

  // Space toggles the timer unless the user is typing or a dialog is open.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code !== "Space") return;
      if (document.querySelector('[role="dialog"]')) return;

      const target = e.target;
      const tag = target?.tagName;
      if (target?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }

      e.preventDefault();
      if (running) timer.pause();
      else timer.start();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const subTotal = (id) =>
    sessions
      .filter((session) => session.subjectId === id)
      .reduce((sum, session) => sum + session.duration, 0);
  const grandTotal = sessions.reduce((sum, session) => sum + session.duration, 0);

  const timerColor =
    (timingAsana ? asanaCfg.color : timedSubject?.color) ||
    (asanaSelected ? asanaCfg.color : sub?.color) ||
    "#888888";
  const timerLabel = timedSubject
    ? timedSubject.name
    : timingAsana || asanaSelected
      ? asanaTask?.name || asanaCfg.name
      : sub?.name || "-";

  const updateCurrentSubject = (fn) => {
    if (sub) setSubjects((prev) => mapSubject(prev, sub.id, fn));
  };

  const updateTopicSubtasks = (topicId, updater) =>
    updateCurrentSubject((subject) => ({
      ...subject,
      topics: subject.topics.map((topic) =>
        topic.id === topicId ? { ...topic, subtasks: updater(topic.subtasks) } : topic
      ),
    }));

  const actions = {
    selectSubject: (id) => {
      setSel(id);
      setExpandedTopic(null);
    },
    selectAsana: () => setSel(asanaCfg.id),
    openAnalysis: () => setView("analysis"),
    openSettings: () => setView("settings"),

    toggleTopic: (subjectId, topicId) => {
      const topic = subjects.find((s) => s.id === subjectId)?.topics.find((t) => t.id === topicId);
      if (topic && !topic.done) setGame((g) => ({ ...g, totalXP: g.totalXP + 10 }));
      setSubjects((prev) =>
        mapSubject(prev, subjectId, (subject) => ({
          ...subject,
          topics: subject.topics.map((t) => (t.id === topicId ? { ...t, done: !t.done } : t)),
        }))
      );
    },
    addTopic: (name) => {
      const topicName = name.trim();
      if (!topicName) return;
      updateCurrentSubject((subject) => ({
        ...subject,
        topics: [
          ...subject.topics,
          { id: Date.now().toString(), name: topicName, done: false, subtasks: [] },
        ],
      }));
    },
    // Milestones never touch XP or streaks.
    addMilestone: (subjectId, { name, kind, due }) => {
      const cleanName = name.trim();
      if (!cleanName) return;
      setSubjects((prev) =>
        mapSubject(prev, subjectId, (subject) =>
          normalizeSubject({
            ...subject,
            milestones: [
              ...(subject.milestones || []),
              { id: `ms-${Date.now().toString(36)}`, name: cleanName, kind, due: due || null, done: false },
            ],
          })
        )
      );
    },
    updateMilestone: (subjectId, milestoneId, patch) =>
      setSubjects((prev) =>
        mapSubject(prev, subjectId, (subject) =>
          normalizeSubject({
            ...subject,
            milestones: (subject.milestones || []).map((milestone) =>
              milestone.id === milestoneId ? { ...milestone, ...patch } : milestone
            ),
          })
        )
      ),
    deleteMilestone: (subjectId, milestoneId) =>
      setSubjects((prev) =>
        mapSubject(prev, subjectId, (subject) =>
          normalizeSubject({
            ...subject,
            milestones: (subject.milestones || []).filter((milestone) => milestone.id !== milestoneId),
          })
        )
      ),
    // "Keep as topic" on the NEA offer: remembered on the topic itself, so the
    // offer stays gone across views, reloads and backups.
    keepAsTopic: (subjectId, topicId) =>
      setSubjects((prev) =>
        mapSubject(prev, subjectId, (subject) => ({
          ...subject,
          topics: subject.topics.map((topic) => (topic.id === topicId ? { ...topic, keepAsTopic: true } : topic)),
        }))
      ),
    // Only called after the user confirms in the milestone strip.
    convertTopicToMilestone: (subjectId, topicId) => {
      if (expandedTopic === topicId) setExpandedTopic(null);
      setSubjects((prev) =>
        mapSubject(prev, subjectId, (subject) => normalizeSubject(convertTopicToMilestone(subject, topicId)))
      );
    },
    // Patch a topic's own fields (e.g. paper, higherOnly); `undefined` removes one.
    updateTopic: (topicId, patch) =>
      updateCurrentSubject((subject) => ({
        ...subject,
        topics: subject.topics.map((topic) => (topic.id === topicId ? { ...topic, ...patch } : topic)),
      })),
    deleteTopic: (topicId) =>
      updateCurrentSubject((subject) => ({
        ...subject,
        topics: subject.topics.filter((topic) => topic.id !== topicId),
      })),
    toggleSubtask: (topicId, subtaskId) =>
      updateTopicSubtasks(topicId, (subtasks) =>
        subtasks.map((st) => (st.id === subtaskId ? { ...st, done: !st.done } : st))
      ),
    addSubtask: (topicId, name) => {
      const subtaskName = name.trim();
      if (!subtaskName) return;
      updateTopicSubtasks(topicId, (subtasks) => [
        ...subtasks,
        { id: `st-${Date.now().toString(36)}`, name: subtaskName, done: false },
      ]);
    },
    deleteSubtask: (topicId, subtaskId) =>
      updateTopicSubtasks(topicId, (subtasks) => subtasks.filter((st) => st.id !== subtaskId)),

    logSession: () => {
      if (!displaySecs || !canTime) return;

      setGame((g) => applyLoggedSession(g, displaySecs, new Date()));

      const isAsana = timingAsana || (!timedSubject && asanaSelected);
      const subjectToLog = isAsana
        ? { id: asanaCfg.id, name: asanaCfg.name, color: asanaCfg.color }
        : timedSubject || sub;
      const selectedTopic =
        !isAsana && timedSubject
          ? timedSubject.topics.find((topic) => topic.id === expandedTopic)
          : null;
      const extraTag = isAsana ? asanaTask?.name : selectedTopic?.name;

      setSessions((prev) => [
        {
          id: `sess-${Date.now().toString(36)}`,
          subjectId: subjectToLog.id,
          subjectName: subjectToLog.name,
          subjectColor: subjectToLog.color,
          duration: displaySecs,
          date: new Date().toISOString(),
          note: note.trim(),
          tags: extraTag ? addUniqueTag(sessionTags, extraTag) : sessionTags,
        },
        ...prev,
      ]);

      setNote("");
      setSessionTags([]);
      timer.reset();
    },
  };

  // New subjects from the add form, a PDF import or the catalogue picker.
  // Each gets a fresh id (unique within the batch) and fresh topic ids.
  const buildNewSubjects = (list) => {
    const stamp = Date.now().toString(36);
    return list.map(({ topics, ...fields }, index) => {
      const id = list.length === 1 ? `custom-${stamp}` : `custom-${stamp}-${index}`;
      return normalizeSubject({
        ...fields,
        id,
        // Topics are names, or objects (catalogueTopicId, paper, higherOnly) when seeded from the catalogue.
        topics: topics.map((topic, i) => ({
          ...(typeof topic === "string" ? { name: topic } : topic),
          id: `${id}-topic-${i}`,
          done: false,
          subtasks: [],
        })),
      });
    });
  };

  // Accepts one subject or a list (the catalogue picker can add several).
  const addSubject = (input) => {
    const added = buildNewSubjects(Array.isArray(input) ? input : [input]);
    if (!added.length) return;
    setSubjects((prev) => [...prev, ...added]);
    setSel(added[0].id);
  };

  const removeSubject = (id) => {
    const next = subjects.filter((subject) => subject.id !== id);
    setSubjects(next);
    if (sel === id) setSel(next[0]?.id || null);
    if (timedSubjectId === id) timer.setTimedSubjectId(null);
  };

  const updateAsanaCfg = (patch) => {
    if ("projectGid" in patch || patch.enabled === false) setAsanaStats(null);
    if (patch.enabled === false) {
      setAsanaTask(null);
      if (sel === asanaCfg.id) setSel(subjects[0]?.id ?? null);
    }
    setAsanaCfg((prev) => ({ ...prev, ...patch }));
  };

  const saveSession = (id, patch) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setEditingSession(null);
  };

  const exportData = () => {
    const backup = buildBackup({ subjects, sessions, themeId, game });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFileName();
    a.click();
    URL.revokeObjectURL(url);
    setBackupMessage({ type: "success", text: "Backup downloaded." });
  };

  const importData = async (file) => {
    if (!file) return { ok: false };
    try {
      const restored = parseBackup(await readFileText(file));
      templateRequest.current += 1;
      if (restored.subjects) {
        setSubjects(restored.subjects);
        setSel(restored.subjects[0]?.id ?? null);
      }
      if (restored.sessions) setSessions(restored.sessions);
      if (restored.themeId) setThemeId(restored.themeId);
      if (restored.game) setGame(restored.game);
      setOnboarded(true);
      setBackupMessage({ type: "success", text: "Backup restored." });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to read backup file.";
      setBackupMessage({ type: "error", text: message });
      return { ok: false, error: message };
    }
  };

  // Onboarding's "Choose my subjects": the picked subjects replace the
  // untouched placeholder list.
  const startWithSubjects = (list) => {
    const chosen = buildNewSubjects(list);
    templateRequest.current += 1;
    setSubjects(chosen);
    setSel(chosen[0]?.id ?? null);
    setOnboarded(true);
  };

  const startBlank = () => {
    templateRequest.current += 1;
    setSubjects([]);
    setSel(null);
    setOnboarded(true);
  };

  // Catalogue-backed templates load their spec chunks on demand, so this is
  // async; Onboarding shows an error if that load fails. Each request takes a
  // ticket; if another onboarding action (start blank, restore, a newer
  // template) happened while it was loading, the stale result is dropped.
  const useTemplate = async (templateId) => {
    const request = ++templateRequest.current;
    try {
      const template = await subjectsForTemplate(templateId);
      if (request !== templateRequest.current) return { ok: true };
      if (!template.length) return { ok: false, error: "That template couldn't be loaded." };
      setSubjects(template);
      setSel(template[0].id);
      setOnboarded(true);
      return { ok: true };
    } catch {
      return { ok: false, error: "That template couldn't be loaded. Check your connection and try again." };
    }
  };

  const needsOnboarding =
    !onboarded && sessions.length === 0 && isUntouchedDefaultSubjects(subjects);

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
      <style>{buildCss(C)}</style>

      {needsOnboarding ? (
        <Onboarding
          C={C}
          onStartBlank={startBlank}
          onUseTemplate={useTemplate}
          onChooseSubjects={startWithSubjects}
          onRestore={importData}
        />
      ) : (
        <>
          <TopBar C={C} view={view} onChangeView={setView} game={game} grandTotal={grandTotal} />

          {view === "planner" && (
            <PlannerView
              C={C}
              subjects={subjects}
              sub={sub}
              sel={sel}
              loggedSecs={sub ? subTotal(sub.id) : 0}
              grandTotal={grandTotal}
              subTotal={subTotal}
              asana={{
                enabled: asanaEnabled,
                cfg: asanaCfg,
                pct: asanaPct,
                selected: asanaSelected,
                task: asanaTask,
                setTask: setAsanaTask,
                setStats: setAsanaStats,
              }}
              timer={{
                running,
                displaySecs,
                canTime,
                color: timerColor,
                label: timerLabel,
                highlightedSubjectId: asanaSelected ? null : sub?.id ?? null,
                start: timer.start,
                pause: timer.pause,
                reset: timer.reset,
              }}
              session={{
                note,
                setNote,
                tags: sessionTags,
                setTags: setSessionTags,
                expandedTopic,
                setExpandedTopic,
              }}
              actions={actions}
            />
          )}

          {view === "log" && (
            <LogView
              C={C}
              subjects={subjects}
              sessions={sessions}
              grandTotal={grandTotal}
              subTotal={subTotal}
              onEditSession={setEditingSession}
              onDeleteSession={(id) => setSessions((prev) => prev.filter((s) => s.id !== id))}
            />
          )}

          {view === "analysis" && (
            <AnalysisPanel
              subjects={subjects}
              sessions={sessions}
              asanaCfg={asanaCfg}
              asanaStats={asanaStats}
              game={game}
              C={C}
            />
          )}

          {view === "settings" && (
            <SettingsView
              C={C}
              themeId={themeId}
              onChangeTheme={setThemeId}
              subjects={subjects}
              onAddSubject={addSubject}
              onUpdateSubject={(id, patch) =>
                setSubjects((prev) => mapSubject(prev, id, (s) => updateSubjectFields(s, patch)))
              }
              onRemoveSubject={removeSubject}
              asanaCfg={asanaCfg}
              onUpdateAsana={updateAsanaCfg}
              backupMessage={backupMessage}
              onExport={exportData}
              onImport={importData}
            />
          )}

          {editingSession && (
            <EditSessionModal
              key={editingSession.id}
              C={C}
              session={editingSession}
              subjects={subjects}
              asanaCfg={asanaCfg}
              onSave={saveSession}
              onClose={() => setEditingSession(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
