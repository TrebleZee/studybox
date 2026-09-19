import { ASANA_DEFAULTS } from "../../services/asanaClient.js";
import { Card, SectionLabel } from "./ui.jsx";

const inputStyle = (C) => ({
  width: "100%",
  background: C.s1,
  border: `1px solid ${C.bdr2}`,
  borderRadius: "8px",
  padding: "8px 9px",
  color: C.txt,
  outline: "none",
});

export default function AsanaSettingsCard({ C, cfg, onUpdate }) {
  if (!cfg.enabled) {
    return (
      <Card C={C} style={{ marginTop: "12px" }}>
        <SectionLabel C={C}>Integrations</SectionLabel>
        <div style={{ color: C.muted, fontSize: "12px", lineHeight: 1.5, marginBottom: "12px" }}>
          Optional: show tasks from an Asana project in the Planner and log study time
          against them. StudyBox works fine without it.
        </div>
        <button
          type="button"
          className="nb"
          onClick={() => onUpdate({ enabled: true })}
          style={{
            border: `1px solid ${C.bdr2}`,
            background: C.s2,
            color: C.txt,
            borderRadius: "8px",
            padding: "9px 14px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Connect Asana
        </button>
      </Card>
    );
  }

  return (
    <Card C={C} style={{ marginTop: "12px" }}>
      <SectionLabel C={C}>Asana integration</SectionLabel>
      <div style={{ color: C.muted, fontSize: "12px", lineHeight: 1.5, marginBottom: "12px" }}>
        Customise the Asana tab shown at the bottom of the Planner sidebar. The access
        token itself is managed from the tab, and progress is estimated from the fraction
        of completed tasks in the project.
      </div>
      <div
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
            background: cfg.color,
            flexShrink: 0,
          }}
        />
        <div style={{ display: "grid", gap: "6px", minWidth: 0 }}>
          <input
            aria-label="Asana tab name"
            value={cfg.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Tab name"
            style={inputStyle(C)}
          />
          <input
            aria-label="Asana tab label"
            value={cfg.exam}
            onChange={(e) => onUpdate({ exam: e.target.value })}
            placeholder="Label"
            style={inputStyle(C)}
          />
          <input
            aria-label="Asana project GID"
            value={cfg.projectGid}
            onChange={(e) => onUpdate({ projectGid: e.target.value })}
            placeholder="Asana project GID"
            style={{ ...inputStyle(C), fontVariantNumeric: "tabular-nums" }}
          />
        </div>
        <input
          type="color"
          aria-label="Asana tab colour"
          value={cfg.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
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
          onClick={() =>
            onUpdate({
              name: ASANA_DEFAULTS.name,
              exam: ASANA_DEFAULTS.exam,
              color: ASANA_DEFAULTS.color,
              projectGid: ASANA_DEFAULTS.projectGid,
            })
          }
          aria-label="Reset Asana tab settings"
          style={{
            border: "none",
            background: "transparent",
            color: C.muted,
            cursor: "pointer",
            fontSize: "11px",
            padding: "0 2px",
            flexShrink: 0,
          }}
        >
          Reset
        </button>
      </div>
      <div
        style={{
          marginTop: "10px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          background: C.s2,
          border: `1px solid ${C.bdr}`,
          borderRadius: "10px",
        }}
      >
        <span style={{ fontSize: "12px", color: C.txt, flex: 1 }}>
          Sort subtasks alphanumerically
          <span style={{ display: "block", fontSize: "10px", color: C.muted, marginTop: "2px" }}>
            Keeps TASK-01, TASK-02... in order instead of by due date. Main tasks stay
            sorted by due date.
          </span>
        </span>
        <input
          type="checkbox"
          aria-label="Sort subtasks alphanumerically"
          checked={cfg.subtaskSort === "alpha"}
          onChange={(e) => onUpdate({ subtaskSort: e.target.checked ? "alpha" : "due" })}
          style={{ width: "16px", height: "16px", cursor: "pointer", flexShrink: 0 }}
        />
      </div>
      <button
        type="button"
        className="nb"
        onClick={() => onUpdate({ enabled: false })}
        style={{
          marginTop: "12px",
          border: "none",
          background: "transparent",
          color: C.muted,
          cursor: "pointer",
          fontSize: "11px",
          padding: 0,
        }}
      >
        Disable Asana integration
      </button>
    </Card>
  );
}
