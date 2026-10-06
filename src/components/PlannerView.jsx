import { useState } from "react";
import useNarrowLayout from "../hooks/useNarrowLayout.js";
import { fmt } from "../utils/format.js";
import AsanaTasksPanel from "./AsanaTasksPanel.jsx";
import MilestoneStrip from "./MilestoneStrip.jsx";
import SubjectSidebar from "./SubjectSidebar.jsx";
import TimerPanel from "./TimerPanel.jsx";
import TopicList from "./TopicList.jsx";

export default function PlannerView({
  C,
  subjects,
  sub,
  sel,
  loggedSecs,
  grandTotal,
  subTotal,
  asana,
  timer,
  session,
  actions,
}) {
  const narrow = useNarrowLayout();
  const [pane, setPane] = useState("topics");
  const showTopics = (fn) => (...args) => {
    setPane("topics");
    return fn(...args);
  };

  return (
    <div
      className="pv"
      data-pane={narrow ? pane : undefined}
      style={{ display: "flex", flex: 1, overflow: "hidden" }}
    >
      {narrow && (
        <div className="pane-switch" role="group" aria-label="Planner pane">
          {[
            ["subjects", "Subjects"],
            ["topics", "Topics"],
            ["timer", timer.displaySecs > 0 ? `Timer ${timer.running ? "▶" : "⏸"} ${fmt(timer.displaySecs)}` : "Timer"],
          ].map(([id, baseLabel]) => {
            // The timer pane's alerts are hidden with it: flag them on its button.
            const alert = id === "timer" && (timer.orphaned || timer.elsewhere);
            const label = alert ? `${baseLabel} !` : baseLabel;
            return (
            <button
              key={id}
              type="button"
              className="nb"
              aria-pressed={pane === id}
              aria-label={alert ? `${baseLabel}, needs attention` : undefined}
              onClick={() => setPane(id)}
              style={{
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                background: pane === id ? C.s3 : C.s1,
                color: pane === id ? C.txt : C.muted,
              }}
            >
              {label}
            </button>
            );
          })}
        </div>
      )}
      <SubjectSidebar
        C={C}
        subjects={subjects}
        sel={sel}
        asanaEnabled={asana.enabled}
        asanaCfg={asana.cfg}
        asanaPct={asana.pct}
        grandTotal={grandTotal}
        onSelectSubject={showTopics(actions.selectSubject)}
        onSelectAsana={showTopics(actions.selectAsana)}
        onOpenAnalysis={actions.openAnalysis}
      />

      <div
        data-pane-id="topics"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {asana.selected ? (
          <AsanaTasksPanel
            C={C}
            cfg={asana.cfg}
            onStats={asana.setStats}
            selectedGid={asana.task?.gid || null}
            onSelectTask={asana.setTask}
          />
        ) : sub ? (
          <>
          <MilestoneStrip
            C={C}
            subjects={subjects}
            defaultSubjectId={sub.id}
            onAdd={actions.addMilestone}
            onUpdate={actions.updateMilestone}
            onDelete={actions.deleteMilestone}
            onConvertTopic={actions.convertTopicToMilestone}
            onKeepTopic={actions.keepAsTopic}
          />
          <TopicList
            key={sub.id}
            C={C}
            sub={sub}
            loggedSecs={loggedSecs}
            expandedTopic={session.expandedTopic}
            setExpandedTopic={session.setExpandedTopic}
            onToggleTopic={(topicId) => actions.toggleTopic(sub.id, topicId)}
            onAddTopic={actions.addTopic}
            onDeleteTopic={actions.deleteTopic}
            onUpdateTopic={actions.updateTopic}
            onToggleSubtask={actions.toggleSubtask}
            onAddSubtask={actions.addSubtask}
            onDeleteSubtask={actions.deleteSubtask}
          />
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              color: C.muted,
              fontSize: "12px",
            }}
          >
            <div>No subjects yet.</div>
            <button
              type="button"
              className="nb"
              onClick={actions.openSettings}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                background: C.s3,
                color: C.txt,
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Add your first subject
            </button>
          </div>
        )}
      </div>

      <TimerPanel
        C={C}
        subjects={subjects}
        running={timer.running}
        displaySecs={timer.displaySecs}
        canTime={timer.canTime}
        elsewhere={timer.elsewhere}
        orphaned={timer.orphaned}
        onChooseSubject={timer.chooseSubject}
        timerColor={timer.color}
        timerLabel={timer.label}
        highlightedSubjectId={timer.highlightedSubjectId}
        asanaCfg={asana.cfg}
        subTotal={subTotal}
        note={session.note}
        setNote={session.setNote}
        sessionTags={session.tags}
        setSessionTags={session.setTags}
        onStart={timer.start}
        onPause={timer.pause}
        onReset={timer.reset}
        onTakeOver={timer.takeOver}
        onLog={actions.logSession}
      />
    </div>
  );
}
