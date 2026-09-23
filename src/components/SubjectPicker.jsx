import { useEffect, useMemo, useRef, useState } from "react";
import {
  groupSpecsBySubject,
  listSpecs,
  loadSpec,
  specAlreadyAdded,
  subjectFromSpec,
} from "../utils/catalogue.js";
import { pickColor } from "../utils/palette.js";
import { QUALIFICATION_LABELS, subjectLabel, TIER_LABELS } from "../utils/subjects.js";

const LEVELS = [
  { id: "", label: "All" },
  { id: "gcse", label: "GCSE" },
  { id: "alevel", label: "A-level" },
];

const buttonStyle = (C, primary = false) => ({
  padding: "7px 12px",
  borderRadius: "8px",
  border: primary ? "none" : `1px solid ${C.bdr2}`,
  background: primary ? C.txt : C.s2,
  color: primary ? C.bg : C.txt,
  fontWeight: primary ? 700 : 500,
  fontSize: "12px",
  cursor: "pointer",
});

const rowButton = (C) => ({
  width: "100%",
  textAlign: "left",
  padding: "9px 11px",
  borderRadius: "8px",
  border: `1px solid ${C.bdr2}`,
  background: C.s2,
  color: C.txt,
  fontSize: "12px",
  cursor: "pointer",
});

const headingStyle = { fontSize: "13px", fontWeight: 700, margin: "0 0 8px", outline: "none" };

// Pick subjects from the spec catalogue: search / filter → subject → board →
// spec → tier and options. "single" mode adds one subject (Settings);
// "multi" mode builds a list and hands it over on Finish (onboarding). All
// picker state lives here; the parent only receives finished subjects.
export default function SubjectPicker({ C, existingSubjects = [], mode = "single", onConfirm, onCancel }) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [step, setStep] = useState("subject"); // subject | board | spec | details
  const [group, setGroup] = useState(null);
  const [board, setBoard] = useState(null);
  const [spec, setSpec] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [tier, setTier] = useState("");
  const [optionIds, setOptionIds] = useState({}); // groupId -> [optionId]
  const [chosen, setChosen] = useState([]); // multi mode: subjects picked so far
  const headingRef = useRef(null);
  const specRequest = useRef(0);

  // Move focus to each step's heading so keyboard and screen-reader users
  // land on the new content.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const taken = [...existingSubjects, ...chosen];
  const groups = useMemo(
    () => groupSpecsBySubject(listSpecs({ query: query.trim(), qualification: level || undefined })),
    [query, level]
  );

  const reset = () => {
    specRequest.current += 1;
    setStep("subject");
    setGroup(null);
    setBoard(null);
    setSpec(null);
    setTier("");
    setOptionIds({});
    setLoadError("");
  };

  const chooseSpec = async (nextEntry) => {
    const request = ++specRequest.current;
    setLoadError("");
    try {
      const loaded = await loadSpec(nextEntry.id);
      // The student may have moved on (Back, another subject) while this
      // chunk loaded; only the latest request may change the step.
      if (request !== specRequest.current) return;
      if (!loaded) throw new Error("missing");
      setSpec(loaded);
      setTier("");
      setOptionIds({});
      setStep("details");
    } catch {
      if (request !== specRequest.current) return;
      setLoadError("That specification couldn't be loaded. Check your connection and try again.");
    }
  };

  const goTo = (target) => {
    specRequest.current += 1; // abandon any spec still loading
    setStep(target);
  };

  const chooseBoard = (next) => {
    setBoard(next);
    const available = next.specs.filter((item) => !specAlreadyAdded(taken, item));
    if (next.specs.length === 1) {
      if (available.length) chooseSpec(next.specs[0]);
      return;
    }
    setStep("spec");
  };

  const toggleOption = (groupId, optionId, pick) => {
    setOptionIds((prev) => {
      const current = prev[groupId] || [];
      if (pick === 1) return { ...prev, [groupId]: current[0] === optionId ? [] : [optionId] };
      return {
        ...prev,
        [groupId]: current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId],
      };
    });
  };

  const buildSubject = () =>
    subjectFromSpec(spec, {
      tier: tier || null,
      optionIds: Object.values(optionIds).flat(),
      color: pickColor(taken.map((subject) => subject.color)),
    });

  const confirmSubject = () => {
    const subject = buildSubject();
    if (mode === "single") {
      onConfirm([subject]);
      reset();
      return;
    }
    setChosen((prev) => [...prev, subject]);
    reset();
  };

  const backButton = (target) => (
    <button type="button" className="nb" onClick={() => goTo(target)} style={buttonStyle(C)}>
      Back
    </button>
  );

  const levelLabel = (qualification) => QUALIFICATION_LABELS[qualification] || qualification;

  let body;
  if (step === "subject") {
    body = (
      <>
        <h2 ref={headingRef} tabIndex={-1} style={headingStyle}>
          Find a subject
        </h2>
        <label style={{ display: "block", fontSize: "11px", color: C.muted }}>
          Search subjects, boards or spec codes
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. maths, AQA biology, H556"
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              marginTop: "4px",
              background: C.s2,
              border: `1px solid ${C.bdr2}`,
              borderRadius: "8px",
              padding: "8px 10px",
              color: C.txt,
              fontSize: "13px",
            }}
          />
        </label>
        <fieldset style={{ border: "none", padding: 0, margin: "10px 0", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <legend style={{ fontSize: "11px", color: C.muted, padding: 0, marginBottom: "4px" }}>Level</legend>
          {LEVELS.map((item) => (
            <label key={item.id || "all"} style={{ fontSize: "12px", display: "flex", gap: "5px", alignItems: "center" }}>
              <input
                type="radio"
                name="picker-level"
                checked={level === item.id}
                onChange={() => setLevel(item.id)}
              />
              {item.label}
            </label>
          ))}
        </fieldset>
        {groups.length === 0 ? (
          <p style={{ fontSize: "12px", color: C.muted }}>
            No subjects match. Try another word, or add the subject yourself.
          </p>
        ) : (
          <ul aria-label="Subjects" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "6px" }}>
            {groups.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className="nb"
                  onClick={() => {
                    setGroup(item);
                    setStep("board");
                  }}
                  aria-label={`${item.subject} · ${levelLabel(item.qualification)} · ${item.boards.map((b) => b.board).join(", ")}`}
                  style={rowButton(C)}
                >
                  <strong>{item.subject}</strong>
                  <span style={{ color: C.muted }}>
                    {" · "}
                    {levelLabel(item.qualification)} · {item.boards.map((b) => b.board).join(", ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  } else if (step === "board") {
    body = (
      <>
        <h2 ref={headingRef} tabIndex={-1} style={headingStyle}>
          {levelLabel(group.qualification)} {group.subject}: which exam board?
        </h2>
        <ul aria-label="Exam boards" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "6px" }}>
          {group.boards.map((item) => {
            const allTaken = item.specs.every((s) => specAlreadyAdded(taken, s));
            return (
              <li key={item.board}>
                <button
                  type="button"
                  className="nb"
                  onClick={() => chooseBoard(item)}
                  disabled={allTaken}
                  aria-describedby={allTaken ? `taken-${item.board}` : undefined}
                  style={{ ...rowButton(C), opacity: allTaken ? 0.55 : 1, cursor: allTaken ? "not-allowed" : "pointer" }}
                >
                  <strong>{item.board === "Edexcel" ? "Pearson Edexcel" : item.board}</strong>
                  {item.specs.length > 1 && <span style={{ color: C.muted }}> · {item.specs.length} specifications</span>}
                  {allTaken && (
                    <span id={`taken-${item.board}`} style={{ color: C.muted }}>
                      {" "}
                      · already added
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {loadError && (
          <p role="alert" style={{ color: "#f87171", fontSize: "12px" }}>
            {loadError}
          </p>
        )}
        <div style={{ marginTop: "10px" }}>{backButton("subject")}</div>
      </>
    );
  } else if (step === "spec") {
    body = (
      <>
        <h2 ref={headingRef} tabIndex={-1} style={headingStyle}>
          {board.board} {group.subject}: which specification?
        </h2>
        <ul aria-label="Specifications" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "6px" }}>
          {board.specs.map((item) => {
            const already = specAlreadyAdded(taken, item);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="nb"
                  onClick={() => chooseSpec(item)}
                  disabled={already}
                  style={{ ...rowButton(C), opacity: already ? 0.55 : 1, cursor: already ? "not-allowed" : "pointer" }}
                >
                  <strong>{item.specName || item.subject}</strong>
                  <span style={{ color: C.muted }}>
                    {" "}
                    ({item.spec}){already ? " · already added" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {loadError && (
          <p role="alert" style={{ color: "#f87171", fontSize: "12px" }}>
            {loadError}
          </p>
        )}
        <div style={{ marginTop: "10px" }}>{backButton("board")}</div>
      </>
    );
  } else {
    const preview = buildSubject();
    const missingTier = spec.tiers && !tier;
    body = (
      <>
        <h2 ref={headingRef} tabIndex={-1} style={headingStyle}>
          {subjectLabel({ ...preview, tier: tier || null })}
        </h2>
        {spec.tiers && (
          <fieldset style={{ border: "none", padding: 0, margin: "0 0 10px" }}>
            <legend style={{ fontSize: "12px", marginBottom: "4px", padding: 0 }}>Tier</legend>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              {spec.tiers.map((item) => (
                <label key={item} style={{ fontSize: "12px", display: "flex", gap: "5px", alignItems: "center" }}>
                  <input type="radio" name="picker-tier" checked={tier === item} onChange={() => setTier(item)} />
                  {TIER_LABELS[item]}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {spec.optionGroups.map((optionGroup) => {
          const selected = optionIds[optionGroup.id] || [];
          return (
            <fieldset key={optionGroup.id} style={{ border: "none", padding: 0, margin: "0 0 10px" }}>
              <legend style={{ fontSize: "12px", marginBottom: "4px", padding: 0 }}>
                {optionGroup.name}{" "}
                <span style={{ color: C.muted }}>
                  (choose {optionGroup.pick}; you can leave it for now)
                </span>
              </legend>
              <div style={{ display: "grid", gap: "4px" }}>
                {optionGroup.options.map((option) => (
                  <label key={option.id} style={{ fontSize: "12px", display: "flex", gap: "6px", alignItems: "flex-start" }}>
                    <input
                      type={optionGroup.pick === 1 ? "radio" : "checkbox"}
                      name={`picker-option-${optionGroup.id}`}
                      checked={selected.includes(option.id)}
                      onChange={() => toggleOption(optionGroup.id, option.id, optionGroup.pick)}
                    />
                    {option.name}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
        <p style={{ fontSize: "11px", color: C.muted, margin: "4px 0 10px" }}>
          {preview.topics.length} topic{preview.topics.length === 1 ? "" : "s"}
          {preview.milestones?.length ? ` and ${preview.milestones.length} milestone${preview.milestones.length === 1 ? "" : "s"}` : ""}
          . You can edit everything after adding.
        </p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="nb"
            onClick={confirmSubject}
            disabled={missingTier}
            style={{ ...buttonStyle(C, true), opacity: missingTier ? 0.5 : 1 }}
          >
            {mode === "single" ? "Add subject" : "Add to my subjects"}
          </button>
          {backButton(board && board.specs.length > 1 ? "spec" : "board")}
        </div>
        {missingTier && (
          <p style={{ fontSize: "11px", color: C.muted, marginTop: "6px" }}>Choose Foundation or Higher first.</p>
        )}
      </>
    );
  }

  return (
    <section
      aria-label="Choose subjects from the catalogue"
      style={{ width: "100%", maxWidth: "520px", boxSizing: "border-box" }}
    >
      {body}
      {mode === "multi" && (
        <div style={{ marginTop: "14px", borderTop: `1px solid ${C.bdr}`, paddingTop: "10px" }}>
          <h3 style={{ fontSize: "12px", margin: "0 0 6px" }}>My subjects ({chosen.length})</h3>
          {chosen.length === 0 ? (
            <p style={{ fontSize: "11px", color: C.muted, margin: 0 }}>
              Nothing yet. You can mix GCSE and A-level subjects.
            </p>
          ) : (
            <ul aria-label="My subjects" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "4px" }}>
              {chosen.map((subject, index) => (
                <li key={`${subject.id}-${index}`} style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "12px" }}>
                  <span aria-hidden="true" style={{ width: "8px", height: "8px", borderRadius: "50%", background: subject.color }} />
                  <span style={{ flex: 1 }}>{subjectLabel(subject)}</span>
                  <button
                    type="button"
                    className="nb"
                    onClick={() => setChosen((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={`Remove ${subjectLabel(subject)}`}
                    style={{ ...buttonStyle(C), padding: "3px 8px" }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="nb"
              onClick={() => onConfirm(chosen)}
              disabled={!chosen.length}
              style={{ ...buttonStyle(C, true), opacity: chosen.length ? 1 : 0.5 }}
            >
              Finish ({chosen.length})
            </button>
            {onCancel && (
              <button type="button" className="nb" onClick={onCancel} style={buttonStyle(C)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
      {mode === "single" && onCancel && (
        <div style={{ marginTop: "10px" }}>
          <button type="button" className="nb" onClick={onCancel} style={buttonStyle(C)}>
            Close
          </button>
        </div>
      )}
    </section>
  );
}
