import { useEffect, useMemo, useRef, useState } from "react";
import AnalysisPanel from "./components/AnalysisPanel.jsx";
import EditSessionModal from "./components/EditSessionModal.jsx";
import LogView from "./components/LogView.jsx";
import Onboarding from "./components/Onboarding.jsx";
import PlannerView from "./components/PlannerView.jsx";
import SettingsView from "./components/SettingsView.jsx";
import TopBar from "./components/TopBar.jsx";
import SaveFailedBanner from "./components/SaveFailedBanner.jsx";
import UndoBar from "./components/UndoBar.jsx";
import UpdateBanner from "./components/UpdateBanner.jsx";
import useAppUpdate from "./hooks/useAppUpdate.js";
import useMilestoneReminder from "./hooks/useMilestoneReminder.js";
import useStreakReminder from "./hooks/useStreakReminder.js";
import useTimer from "./hooks/useTimer.js";
import useSaveFailure from "./hooks/useSaveFailure.js";
import useSpaceToggle from "./hooks/useSpaceToggle.js";
import useUndoDelete from "./hooks/useUndoDelete.js";
import { buildCss } from "./utils/appCss.js";
import { buildBackup, downloadBackup, parseBackup, readFileText } from "./utils/backup.js";
import { draftFields, timedTopic } from "./utils/sessionDraft.js";
import { applyLoggedSession, deriveXP, streakExpiry, validateStreak } from "./utils/gameLogic.js";
import { loaders, tabMerges } from "./store/appState.js";
import { loadJson, removeKey, saveJson, STORAGE_KEYS, usePersistedState } from "./store/index.js";
import {
  addUniqueTag,
  buildNewSubjects,
  isUntouchedDefaultSubjects,
  normalizeSubject,
  topicTimerLabel,
  updateSubjectFields,
} from "./utils/subjects.js";
import { subjectsForTemplate } from "./utils/catalogue.js";
import { mergeData } from "./utils/merge.js";
import { convertTopicToMilestone } from "./utils/milestones.js";
import { newId, nowIso, stampNew, touch } from "./utils/records.js";
import { addTombstone, childKey, mergeTombstones, subtaskKey } from "./utils/tombstones.js";
import { canUndoImport, stateAfterRestore, stateBeforeImport } from "./utils/undo.js";
import { THEMES } from "./utils/themes.js";

const mapSubject = (subjects, id, fn) =>
  subjects.map((subject) => (subject.id === id ? fn(subject) : subject));

const mapMilestones = (subjects, subjectId, fn) =>
  mapSubject(subjects, subjectId, (subject) => normalizeSubject({ ...subject, milestones: fn(subject.milestones || []) }));

// Edits stamp the record they change (updatedAt), which is what sync merges on.
const mapTopic = (subject, topicId, fn) => ({
  ...subject,
  topics: subject.topics.map((topic) => (topic.id === topicId ? touch(fn(topic)) : topic)),
});

export default function StudyBox() {
  // Another tab's changes are merged in (see store/appState.js), against
  // this tab's tombstones as well as the stored ones.
  const [tombstones, setTombstones] = usePersistedState(STORAGE_KEYS.tombstones, loaders.tombstones, mergeTombstones);
  const merge = tabMerges(tombstones);
  const [themeId, setThemeId] = usePersistedState(STORAGE_KEYS.theme, loaders.theme);
  const [subjects, setSubjects] = usePersistedState(STORAGE_KEYS.subjects, loaders.subjects, merge.subjects);
  const [sessions, setSessions] = usePersistedState(STORAGE_KEYS.sessions, loaders.sessions, merge.sessions);
  const [asanaCfg, setAsanaCfg] = usePersistedState(STORAGE_KEYS.asana, loaders.asana);
  const [asanaStats, setAsanaStats] = usePersistedState(STORAGE_KEYS.asanaStats, loaders.asanaStats);
  const [game, setGame] = usePersistedState(STORAGE_KEYS.game, loaders.game, merge.game);
  const entomb = (kind, id) => setTombstones((prev) => addTombstone(prev, kind, id));
  const [onboarded, setOnboarded] = usePersistedState(STORAGE_KEYS.onboarded, loaders.onboarded);
  const templateRequest = useRef(0);
  // The unlogged session's note, tags and timed topic are saved alongside the
  // timer so a reload doesn't lose them.
  const [savedDraft] = useState(() => loadJson(STORAGE_KEYS.sessionDraft, null));
  // The timed topic comes back (with its subject selected, so the topic list
  // keeps it expanded) only if it still exists on the timed subject.
  const [restoredTopic] = useState(() =>
    timedTopic(subjects, loadJson(STORAGE_KEYS.timer, null)?.timedSubjectId, savedDraft?.topicId)
  );
  const [sel, setSel] = useState(() => restoredTopic?.subjectId ?? subjects[0]?.id ?? null);
  const [view, setView] = useState("planner");
  const [asanaTask, setAsanaTask] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(() => restoredTopic?.topicId ?? null);
  const [note, setNote] = useState(() => draftFields(savedDraft).note);
  const [sessionTags, setSessionTags] = useState(() => draftFields(savedDraft).tags);
  const [editingSession, setEditingSession] = useState(null);
  const [backupMessage, setBackupMessage] = useState(null);

  const theme = THEMES.find((item) => item.id === themeId) || THEMES[0];
  const C = theme.colors;

  // XP is derived from the records, never incremented: this keeps the stored
  // total in step with them (unticking a topic or deleting a session takes
  // its XP back).
  const totalXP = deriveXP(sessions, subjects) + (game.legacyXP || 0);
  useEffect(() => {
    setGame((current) => (current.totalXP === totalXP ? current : { ...current, totalXP }));
  }, [totalXP, setGame]);

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
  }, [game.currentStreak, game.freezesUsed, game.lastStudyDate, game.streakProtectedUntil, setGame]);

  const sub = subjects.find((subject) => subject.id === sel) || subjects[0] || null;
  const asanaEnabled = asanaCfg.enabled;
  const asanaSelected = asanaEnabled && sel === asanaCfg.id;
  const asanaPct =
    asanaStats && asanaStats.total > 0
      ? Math.round((asanaStats.completed / asanaStats.total) * 100)
      : null;
  const canTime = asanaSelected || Boolean(sub);

  const timer = useTimer({
    ...{ canTime, defaultSubjectId: asanaSelected ? asanaCfg.id : sub?.id ?? null },
    onAdopt: () => {
      const draft = draftFields(loadJson(STORAGE_KEYS.sessionDraft, null));
      setNote(draft.note);
      setSessionTags(draft.tags);
    },
  });
  useStreakReminder(game);
  useMilestoneReminder(subjects);
  const { running, displaySecs, timedSubjectId } = timer;
  const timedSubject = subjects.find((subject) => subject.id === timedSubjectId);
  const timingAsana = asanaEnabled && timedSubjectId === asanaCfg.id;
  const sessionInProgress = running || displaySecs > 0;
  const orphaned = sessionInProgress && !timedSubject && !timingAsana; // its subject was deleted (N15)
  const needsOnboarding =
    !onboarded && sessions.length === 0 && isUntouchedDefaultSubjects(subjects);
  const { undo, noteDeletion, noteTimerReset, undoDelete, clearUndo } = useUndoDelete({
    ...{ subjects, sessions, tombstones, setSubjects, setSessions, setTombstones, timerBusy: sessionInProgress || timer.elsewhere },
    onRestore: ({ id, selected, timed, timer: reset, topicId }) => {
      if (reset) timer.restore(reset);
      // Undoing a Reset brings its timed topic back the way a reload does.
      const topic = reset && timedTopic(subjects, reset.timedSubjectId, topicId);
      if (topic) {
        setSel(topic.subjectId);
        setExpandedTopic(topic.topicId);
      }
      if (selected) setSel(id);
      if (timed) timer.setTimedSubjectId(id);
    },
  });
  const changeView = (next) => {
    setView(next);
    clearUndo();
  };
  const saveFailed = useSaveFailure();
  const appUpdate = useAppUpdate({
    sessionInProgress,
    idle: view === "planner" && !needsOnboarding,
  });

  // The timed topic is only saved while a session is in progress; outside one
  // the expanded topic is just navigation.
  const draftTopicId = sessionInProgress && timedSubject ? expandedTopic : null;
  useEffect(() => {
    if (timer.elsewhere) return;
    if (!note && !sessionTags.length && !draftTopicId) {
      removeKey(STORAGE_KEYS.sessionDraft);
    } else {
      saveJson(STORAGE_KEYS.sessionDraft, { note, tags: sessionTags, topicId: draftTopicId });
    }
  }, [note, sessionTags, draftTopicId, timer.elsewhere]);

  useSpaceToggle(() => (running ? timer.pause() : timer.start()));

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
    ? topicTimerLabel(timedSubject, expandedTopic)
    : timingAsana || asanaSelected
      ? asanaTask?.name || asanaCfg.name
      : topicTimerLabel(sub, expandedTopic);

  const updateCurrentSubject = (fn) => {
    if (sub) setSubjects((prev) => mapSubject(prev, sub.id, fn));
  };

  // Subtasks are records (N19): an edit stamps the subtask, not its topic.
  const updateTopicSubtasks = (topicId, updater) =>
    updateCurrentSubject((subject) => ({
      ...subject,
      topics: subject.topics.map((t) => (t.id === topicId ? { ...t, subtasks: updater(t.subtasks) } : t)),
    }));

  const actions = {
    selectSubject: (id) => {
      setSel(id);
      setExpandedTopic(null);
    },
    selectAsana: () => setSel(asanaCfg.id),
    openAnalysis: () => changeView("analysis"),
    openSettings: () => changeView("settings"),

    toggleTopic: (subjectId, topicId) => {
      setSubjects((prev) =>
        mapSubject(prev, subjectId, (subject) => mapTopic(subject, topicId, (t) => ({ ...t, done: !t.done })))
      );
    },
    addTopic: (name) => {
      const topicName = name.trim();
      if (!topicName) return;
      updateCurrentSubject((subject) => ({
        ...subject,
        topics: [
          ...subject.topics,
          stampNew({ id: newId("topic"), name: topicName, done: false, subtasks: [] }),
        ],
      }));
    },
    // Milestones never touch XP or streaks.
    addMilestone: (subjectId, { name, kind, due }) => {
      const cleanName = name.trim();
      if (!cleanName) return;
      setSubjects((prev) =>
        mapMilestones(prev, subjectId, (milestones) => [
          ...milestones,
          stampNew({ id: newId("ms"), name: cleanName, kind, due: due || null, done: false }),
        ])
      );
    },
    updateMilestone: (subjectId, milestoneId, patch) =>
      setSubjects((prev) =>
        mapMilestones(prev, subjectId, (milestones) =>
          milestones.map((milestone) => (milestone.id === milestoneId ? touch({ ...milestone, ...patch }) : milestone))
        )
      ),
    deleteMilestone: (subjectId, milestoneId) => {
      noteDeletion("milestones", milestoneId, subjectId);
      entomb("milestones", childKey(subjectId, milestoneId));
      setSubjects((prev) =>
        mapMilestones(prev, subjectId, (milestones) => milestones.filter((milestone) => milestone.id !== milestoneId))
      );
    },
    // "Keep as topic" on the NEA offer: remembered on the topic itself, so the
    // offer stays gone across views, reloads and backups.
    keepAsTopic: (subjectId, topicId) =>
      setSubjects((prev) =>
        mapSubject(prev, subjectId, (subject) =>
          mapTopic(subject, topicId, (topic) => ({ ...topic, keepAsTopic: true }))
        )
      ),
    // Only called after the user confirms in the milestone strip.
    convertTopicToMilestone: (subjectId, topicId) => {
      if (expandedTopic === topicId) setExpandedTopic(null);
      entomb("topics", childKey(subjectId, topicId));
      setSubjects((prev) =>
        mapSubject(prev, subjectId, (subject) =>
          normalizeSubject(convertTopicToMilestone(subject, topicId, newId("ms"), nowIso()))
        )
      );
    },
    // Patch a topic's own fields (e.g. paper, higherOnly); `undefined` removes one.
    updateTopic: (topicId, patch) =>
      updateCurrentSubject((subject) => mapTopic(subject, topicId, (topic) => ({ ...topic, ...patch }))),
    deleteTopic: (topicId) => {
      if (!sub) return;
      noteDeletion("topics", topicId, sub.id);
      entomb("topics", childKey(sub.id, topicId));
      updateCurrentSubject((subject) => ({
        ...subject,
        topics: subject.topics.filter((topic) => topic.id !== topicId),
      }));
    },
    toggleSubtask: (topicId, subtaskId) =>
      updateTopicSubtasks(topicId, (subtasks) => subtasks.map((st) => (st.id === subtaskId ? touch({ ...st, done: !st.done }) : st))),
    addSubtask: (topicId, name) => {
      const subtaskName = name.trim();
      if (!subtaskName) return;
      updateTopicSubtasks(topicId, (subtasks) => [...subtasks, stampNew({ id: newId("st"), name: subtaskName, done: false })]);
    },
    deleteSubtask: (topicId, subtaskId) => {
      if (sub) entomb("subtasks", subtaskKey(sub.id, topicId, subtaskId));
      updateTopicSubtasks(topicId, (subtasks) => subtasks.filter((st) => st.id !== subtaskId));
    },

    logSession: () => {
      if (!displaySecs || !canTime || orphaned) return;

      setGame((g) => applyLoggedSession(g, new Date()));

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
        stampNew({
          id: newId("sess"),
          subjectId: subjectToLog.id,
          subjectName: subjectToLog.name,
          subjectColor: subjectToLog.color,
          duration: displaySecs,
          date: new Date().toISOString(),
          note: note.trim(),
          tags: extraTag ? addUniqueTag(sessionTags, extraTag) : sessionTags,
        }),
        ...prev,
      ]);

      setNote("");
      setSessionTags([]);
      timer.reset();
    },
  };

  // Accepts one subject or a list (the catalogue picker can add several).
  const addSubject = (input) => {
    const added = buildNewSubjects(Array.isArray(input) ? input : [input]);
    if (!added.length) return;
    setSubjects((prev) => [...prev, ...added]);
    setSel(added[0].id);
  };

  const removeSubject = (id) => {
    noteDeletion("subjects", id, null, { selected: sel === id, timed: timedSubjectId === id });
    const next = subjects.filter((subject) => subject.id !== id);
    entomb("subjects", id);
    setSubjects(next);
    if (sel === id) setSel(next[0]?.id || null);
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
    setSessions((prev) => prev.map((s) => (s.id === id ? touch({ ...s, ...patch }) : s)));
    setEditingSession(null);
  };

  const deleteSession = (id) => {
    noteDeletion("sessions", id);
    entomb("sessions", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const exportData = () => {
    const backup = buildBackup({ subjects, sessions, themeId, game, tombstones });
    downloadBackup(backup);
    setBackupMessage((message) => ({ type: "success", text: "Backup downloaded.", undo: message?.undo }));
  };

  const setData = (data) => {
    setSubjects(data.subjects);
    setSessions(data.sessions);
    setTombstones(data.tombstones);
    setGame(data.game);
  };

  // Restore replaces everything with the file. Merge ({ merge: true }) folds
  // the file into what's here, record by record (see utils/merge.js).
  const importData = async (file, { merge = false } = {}) => {
    if (!file) return { ok: false };
    try {
      const restored = parseBackup(await readFileText(file));
      templateRequest.current += 1;
      // Undo is offered only while nothing has changed since (utils/undo.js).
      const before = { subjects, sessions, tombstones, game, themeId, onboarded, sel, timedSubjectId };
      if (merge) {
        const theirs = { subjects: restored.subjects ?? [], sessions: restored.sessions ?? [] };
        const incoming = { ...theirs, tombstones: restored.tombstones, game: restored.game ?? game };
        const merged = mergeData({ subjects, sessions, tombstones, game }, incoming);
        setData(merged);
        if (!merged.subjects.some((subject) => subject.id === sel)) setSel(merged.subjects[0]?.id ?? null);
        if (timedSubjectId && !merged.subjects.some((subject) => subject.id === timedSubjectId)) {
          timer.setTimedSubjectId(null);
        }
        setOnboarded(true);
        const text = "Backup merged with the data on this device.";
        setBackupMessage({ type: "success", text, undo: { kind: "merge", before, after: merged } });
        return { ok: true };
      }
      const after = stateAfterRestore(restored, { subjects, sessions, game, themeId });
      setData(after);
      if (restored.subjects) setSel(after.subjects[0]?.id ?? null);
      setThemeId(after.themeId);
      setOnboarded(true);
      setBackupMessage({ type: "success", text: "Backup restored.", undo: { kind: "restore", before, after } });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to read backup file.";
      setBackupMessage({ type: "error", text: message });
      return { ok: false, error: message };
    }
  };

  // Undo merge or Undo restore (N11), beside the import's message.
  const offer = backupMessage?.undo;
  const current = useMemo(() => ({ subjects, sessions, tombstones, game, themeId }), [subjects, sessions, tombstones, game, themeId]);
  const canUndo = useMemo(() => canUndoImport(offer, current), [offer, current]); // not on every timer tick (R2)
  const undoImport = () => {
    if (!canUndo) return;
    const before = stateBeforeImport(offer, current);
    setData(before);
    setThemeId(before.themeId);
    setOnboarded(before.onboarded);
    setSel(before.sel);
    // Selecting or timing a subject doesn't withdraw the offer, so a timer on a subject only the import added is cleared.
    const timedGone = timedSubjectId && !before.subjects.some((subject) => subject.id === timedSubjectId);
    if (before.timedSubjectId || timedGone) timer.setTimedSubjectId(before.timedSubjectId ?? null);
    setBackupMessage({ type: "success", text: offer.kind === "restore" ? "Restore undone." : "Merge undone." });
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
      {saveFailed && <SaveFailedBanner C={C} reason={saveFailed} onDownload={exportData} />}

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
          <TopBar C={C} view={view} onChangeView={changeView} game={game} grandTotal={grandTotal} subjects={subjects} />

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
                ...{ start: timer.start, pause: timer.pause, elsewhere: timer.elsewhere, takeOver: timer.takeOver, orphaned, chooseSubject: timer.setTimedSubjectId },
                reset: () => noteTimerReset(timer.reset(), { topicId: draftTopicId }),
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
              asanaCfg={asanaCfg}
              grandTotal={grandTotal}
              subTotal={subTotal}
              onEditSession={setEditingSession}
              onDeleteSession={deleteSession}
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
                setSubjects((prev) => mapSubject(prev, id, (s) => touch(updateSubjectFields(s, patch))))
              }
              onRemoveSubject={removeSubject}
              asanaCfg={asanaCfg}
              onUpdateAsana={updateAsanaCfg}
              backupMessage={backupMessage}
              onExport={exportData}
              onImport={importData}
              onMerge={(file) => importData(file, { merge: true })}
              onUndoImport={canUndo ? undoImport : undefined}
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

      {undo && <UndoBar C={C} name={undo.name} message={undo.message} onUndo={undoDelete} onDismiss={clearUndo} raised={appUpdate.updateReady} />}
      {appUpdate.updateReady && <UpdateBanner C={C} onUpdate={appUpdate.applyNow} />}
    </div>
  );
}
