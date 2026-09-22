import { useState } from "react";
import { TEMPLATES } from "../utils/subjects.js";

const optionStyle = (C) => ({
  textAlign: "left",
  width: "100%",
  padding: "14px 16px",
  borderRadius: "10px",
  border: `1px solid ${C.bdr2}`,
  background: C.s2,
  color: C.txt,
  cursor: "pointer",
});

export default function Onboarding({ C, onStartBlank, onUseTemplate, onRestore }) {
  const [error, setError] = useState("");

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: C.s1,
          border: `1px solid ${C.bdr}`,
          borderRadius: "16px",
          padding: "26px",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.3px" }}>
          Welcome to StudyBox
        </h1>
        <p style={{ color: C.muted, fontSize: "12px", lineHeight: 1.6, margin: "6px 0 18px" }}>
          Plan your revision, time your study sessions and see your progress. Everything is
          stored in this browser only. How would you like to start?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button type="button" className="nb" onClick={onStartBlank} style={optionStyle(C)}>
            <div style={{ fontWeight: 700, fontSize: "13px" }}>Start blank</div>
            <div style={{ color: C.muted, fontSize: "11px", marginTop: "3px" }}>
              Add your own subjects and topics.
            </div>
          </button>
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className="nb"
              onClick={() => onUseTemplate(template.id)}
              style={optionStyle(C)}
            >
              <div style={{ fontWeight: 700, fontSize: "13px" }}>Use {template.name}</div>
              <div style={{ color: C.muted, fontSize: "11px", marginTop: "3px" }}>
                {template.description} Edit or delete anything.
              </div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: "16px", fontSize: "11px", color: C.muted }}>
          Already have a backup?{" "}
          <label style={{ color: C.txt, cursor: "pointer", textDecoration: "underline" }}>
            Restore from file
            <input
              type="file"
              accept="application/json,.json"
              aria-label="Restore backup file"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const result = await onRestore(file);
                setError(result?.ok ? "" : result?.error || "Unable to read backup file.");
              }}
            />
          </label>
        </div>
        {error && (
          <div role="alert" style={{ marginTop: "8px", fontSize: "11px", color: "#f87171" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
