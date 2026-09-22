import { useState } from "react";
import { allMilestones, dueLabel, isOverdue, neaTopicCandidates } from "../utils/milestones.js";
import { MILESTONE_KINDS, MILESTONE_KIND_LABELS } from "../utils/subjects.js";

const OVERDUE = "#f87171";

const inputStyle = (C) => ({
  background: C.s2,
  border: `1px solid ${C.bdr2}`,
  borderRadius: "6px",
  padding: "5px 8px",
  color: C.txt,
  outline: "none",
  fontSize: "12px",
});

const smallButton = (C, primary = false) => ({
  padding: "4px 9px",
  borderRadius: "6px",
  border: primary ? "none" : `1px solid ${C.bdr2}`,
  background: primary ? C.s3 : "transparent",
  color: C.txt,
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: primary ? 700 : 400,
});

// Name / kind / due fields shared by the add and edit forms.
function MilestoneFields({ C, value, onChange, labelSuffix }) {
  return (
    <>
      <input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        placeholder="Milestone, e.g. NEA draft"
        aria-label={`Milestone name${labelSuffix}`}
        style={{ ...inputStyle(C), flex: "1 1 160px", minWidth: 0 }}
      />
      <select
        value={value.kind}
        onChange={(e) => onChange({ ...value, kind: e.target.value })}
        aria-label={`Milestone kind${labelSuffix}`}
        style={inputStyle(C)}
      >
        {MILESTONE_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {MILESTONE_KIND_LABELS[kind]}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={value.due || ""}
        onChange={(e) => onChange({ ...value, due: e.target.value || null })}
        aria-label={`Milestone due date${labelSuffix}`}
        style={inputStyle(C)}
      />
    </>
  );
}

// Milestones across all subjects, soonest first, with add / edit / complete
// inline. Milestones never award XP or affect streaks.
export default function MilestoneStrip({
  C,
  subjects,
  defaultSubjectId,
  onAdd,
  onUpdate,
  onDelete,
  onConvertTopic,
  now = new Date(),
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ subjectId: "", name: "", kind: "nea", due: null });
  const [editing, setEditing] = useState(null); // { id, subjectId, name, kind, due }
  const [showDone, setShowDone] = useState(false);
  const [confirmingTopic, setConfirmingTopic] = useState(null);
  const [dismissedTopics, setDismissedTopics] = useState([]);

  if (!subjects.length) return null;

  const milestones = allMilestones(subjects);
  const open = milestones.filter((milestone) => !milestone.done);
  const done = milestones.filter((milestone) => milestone.done);
  const overdueCount = open.filter((milestone) => isOverdue(milestone, now)).length;
  const suggestions = neaTopicCandidates(subjects).filter(
    ({ topic }) => !dismissedTopics.includes(topic.id)
  );
  const draftSubjectId = draft.subjectId || defaultSubjectId || subjects[0].id;

  const submitAdd = () => {
    if (!draft.name.trim()) return;
    onAdd(draftSubjectId, { name: draft.name, kind: draft.kind, due: draft.due });
    setDraft({ subjectId: draftSubjectId, name: "", kind: draft.kind, due: null });
    setAdding(false);
  };

  const saveEdit = () => {
    if (!editing.name.trim()) return;
    onUpdate(editing.subjectId, editing.id, {
      name: editing.name.trim(),
      kind: editing.kind,
      due: editing.due || null,
    });
    setEditing(null);
  };

  const renderMilestone = (milestone) => {
    const overdue = isOverdue(milestone, now);
    if (editing?.id === milestone.id && editing.subjectId === milestone.subjectId) {
      return (
        <li key={`${milestone.subjectId}:${milestone.id}`} style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "5px 0" }}>
          <MilestoneFields C={C} value={editing} onChange={setEditing} labelSuffix={` for ${milestone.name}`} />
          <button type="button" className="nb" onClick={saveEdit} style={smallButton(C, true)}>
            Save
          </button>
          <button type="button" className="nb" onClick={() => setEditing(null)} style={smallButton(C)}>
            Cancel
          </button>
        </li>
      );
    }
    return (
      <li
        key={`${milestone.subjectId}:${milestone.id}`}
        className="topic-row"
        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", fontSize: "12px" }}
      >
        <input
          type="checkbox"
          checked={milestone.done}
          onChange={() => onUpdate(milestone.subjectId, milestone.id, { done: !milestone.done })}
          aria-label={`${milestone.done ? "Reopen" : "Complete"} milestone ${milestone.name}`}
        />
        <span
          style={{ width: "7px", height: "7px", borderRadius: "50%", background: milestone.subjectColor, flexShrink: 0 }}
          aria-hidden="true"
        />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            color: milestone.done ? C.muted : C.txt,
            textDecoration: milestone.done ? "line-through" : "none",
          }}
        >
          {milestone.name}
          <span style={{ color: C.muted }}>
            {" · "}
            {milestone.subjectName} · {MILESTONE_KIND_LABELS[milestone.kind]}
          </span>
        </span>
        {!milestone.done && (
          <span
            data-overdue={overdue ? "true" : undefined}
            style={{ color: overdue ? OVERDUE : C.muted, fontWeight: overdue ? 700 : 400, flexShrink: 0 }}
          >
            {dueLabel(milestone, now)}
            {milestone.due ? ` (${milestone.due})` : ""}
          </span>
        )}
        <button
          type="button"
          className="nb"
          onClick={() =>
            setEditing({
              id: milestone.id,
              subjectId: milestone.subjectId,
              name: milestone.name,
              kind: milestone.kind,
              due: milestone.due,
            })
          }
          aria-label={`Edit milestone ${milestone.name}`}
          style={smallButton(C)}
        >
          Edit
        </button>
        <button
          type="button"
          className="nb"
          onClick={() => onDelete(milestone.subjectId, milestone.id)}
          aria-label={`Delete milestone ${milestone.name}`}
          style={{ ...smallButton(C), border: "none", color: C.muted }}
        >
          x
        </button>
      </li>
    );
  };

  return (
    <section
      aria-label="Milestones"
      style={{ padding: "8px 16px", borderBottom: `1px solid ${C.bdr}`, flexShrink: 0, maxHeight: "40%", overflowY: "auto" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{ fontSize: "10px", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "1px" }}
        >
          Milestones
        </span>
        <span style={{ fontSize: "11px", color: overdueCount ? OVERDUE : C.muted }}>
          {open.length ? `${open.length} to do` : "None yet"}
          {overdueCount ? ` · ${overdueCount} overdue` : ""}
        </span>
        <button
          type="button"
          className="nb"
          onClick={() => setAdding((prev) => !prev)}
          aria-expanded={adding}
          style={{ ...smallButton(C), marginLeft: "auto" }}
        >
          Add milestone
        </button>
      </div>

      {adding && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
          <select
            value={draftSubjectId}
            onChange={(e) => setDraft({ ...draft, subjectId: e.target.value })}
            aria-label="Milestone subject"
            style={inputStyle(C)}
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <MilestoneFields C={C} value={draft} onChange={setDraft} labelSuffix="" />
          <button type="button" className="nb" onClick={submitAdd} style={smallButton(C, true)}>
            Add
          </button>
        </div>
      )}

      {suggestions.map(({ subjectId, subjectName, topic }) => (
        <div
          key={topic.id}
          role="group"
          aria-label={`Suggestion for ${topic.name}`}
          style={{
            marginTop: "8px",
            padding: "8px 10px",
            border: `1px dashed ${C.bdr2}`,
            borderRadius: "8px",
            fontSize: "11px",
            color: C.muted,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {confirmingTopic === topic.id ? (
            <>
              <span style={{ flex: "1 1 200px", color: C.txt }}>
                Remove the topic &ldquo;{topic.name}&rdquo; from {subjectName} and add it as an NEA milestone?
              </span>
              <button
                type="button"
                className="nb"
                onClick={() => {
                  onConvertTopic(subjectId, topic.id);
                  setConfirmingTopic(null);
                }}
                style={smallButton(C, true)}
              >
                Confirm
              </button>
              <button type="button" className="nb" onClick={() => setConfirmingTopic(null)} style={smallButton(C)}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <span style={{ flex: "1 1 200px" }}>
                &ldquo;{topic.name}&rdquo; in {subjectName} looks like an NEA. Track it as a milestone with a due date?
              </span>
              <button
                type="button"
                className="nb"
                onClick={() => setConfirmingTopic(topic.id)}
                style={smallButton(C, true)}
              >
                Convert to milestone
              </button>
              <button
                type="button"
                className="nb"
                onClick={() => setDismissedTopics((prev) => [...prev, topic.id])}
                style={smallButton(C)}
              >
                Keep as topic
              </button>
            </>
          )}
        </div>
      ))}

      {open.length > 0 && <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>{open.map(renderMilestone)}</ul>}

      {done.length > 0 && (
        <>
          <button
            type="button"
            className="nb"
            onClick={() => setShowDone((prev) => !prev)}
            aria-expanded={showDone}
            style={{ ...smallButton(C), border: "none", padding: "4px 0", color: C.muted, marginTop: "4px" }}
          >
            Completed milestones ({done.length}) {showDone ? "▾" : "▸"}
          </button>
          {showDone && <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{done.map(renderMilestone)}</ul>}
        </>
      )}
    </section>
  );
}
