import { useEffect, useState } from "react";
import AnalysisPanel from "./components/AnalysisPanel.jsx";
import EditSessionModal from "./components/EditSessionModal.jsx";
import LogView from "./components/LogView.jsx";
import Onboarding from "./components/Onboarding.jsx";
import PlannerView from "./components/PlannerView.jsx";
import SettingsView from "./components/SettingsView.jsx";
import TopBar from "./components/TopBar.jsx";
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
  defaultSubjects,
  isUntouchedDefaultSubjects,
  normalizeSessions,
  normalizeSubjects,
} from "./utils/subjects.js";
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

  const addSubject = ({ name, exam, color, topics }) => {
    const id = `custom-${Date.now().toString(36)}`;
    setSubjects((prev) => [
      ...prev,
      {
        id,
        name,
        exam,
        color,
        topics: topics.map((topic, i) => ({
          id: `${id}-topic-${i}`,
          name: topic,
          done: false,
          subtasks: [],
        })),
      },
    ]);
    setSel(id);
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

  const startBlank = () => {
    setSubjects([]);
    setSel(null);
    setOnboarded(true);
  };

  const useTemplate = () => {
    const template = defaultSubjects();
    setSubjects(template);
    setSel(template[0].id);
    setOnboarded(true);
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
                setSubjects((prev) => mapSubject(prev, id, (s) => ({ ...s, ...patch })))
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
