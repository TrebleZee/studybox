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
  const [loadingTemplate, setLoadingTemplate] = useState(null);
  // While a template loads, every other start option is locked so its result
  // can't be overwritten when the template arrives.
  const loading = loadingTemplate !== null;

  const chooseTemplate = async (templateId) => {
    setLoadingTemplate(templateId);
    setError("");
    const result = await onUseTemplate(templateId);
    // On success Onboarding unmounts, so only a failure needs state updates.
    if (!result?.ok) {
      setLoadingTemplate(null);
      setError(result?.error || "That template couldn't be loaded.");
    }
  };

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
          <button
            type="button"
            className="nb"
            disabled={loading}
            onClick={onStartBlank}
            style={optionStyle(C)}
          >
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
              disabled={loading}
              aria-busy={loadingTemplate === template.id}
              onClick={() => chooseTemplate(template.id)}
              style={optionStyle(C)}
            >
              <div style={{ fontWeight: 700, fontSize: "13px" }}>
                Use {template.name}
                {loadingTemplate === template.id ? " (loading…)" : ""}
              </div>
              <div style={{ color: C.muted, fontSize: "11px", marginTop: "3px" }}>
                {template.description} Edit or delete anything.
              </div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: "16px", fontSize: "11px", color: C.muted }}>
          Already have a backup?{" "}
          <label
            style={{
              color: C.txt,
              cursor: loading ? "default" : "pointer",
              textDecoration: "underline",
              opacity: loading ? 0.5 : 1,
            }}
          >
            Restore from file
            <input
              type="file"
              accept="application/json,.json"
              aria-label="Restore backup file"
              disabled={loading}
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
