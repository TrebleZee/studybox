import { useState } from "react";
import { extractPdfText, generateSubjectDraftFromPdfText } from "../../utils/specImport.js";
import { boardFromText, normalizeSubject, SUBJECT_PRESETS } from "../../utils/subjects.js";
import SubjectMetaFields from "./SubjectMetaFields.jsx";

const EMPTY_META = { qualification: "other", board: "Custom", tier: null, spec: "", exam: "" };

const presetMeta = (preset) => {
  const { qualification, board, tier, spec, specName, exam } = normalizeSubject(preset);
  return { qualification, board, tier, spec: spec || "", specName, exam };
};

export default function AddSubjectCard({ C, onAddSubject }) {
  const [subjectName, setSubjectName] = useState("");
  const [subjectMeta, setSubjectMeta] = useState(EMPTY_META);
  const [subjectColor, setSubjectColor] = useState("#4F9CF9");
  const [specFileName, setSpecFileName] = useState("");
  const [specImporting, setSpecImporting] = useState(false);
  const [specError, setSpecError] = useState("");
  const [specTopics, setSpecTopics] = useState([]);

  const addSubject = () => {
    const cleanName = subjectName.trim();
    if (!cleanName) return;

    onAddSubject({
      ...subjectMeta,
      name: cleanName,
      spec: subjectMeta.spec.trim() || null,
      exam: subjectMeta.exam.trim() || "Custom",
      color: subjectColor,
      topics: specTopics,
    });
    setSubjectName("");
    setSubjectMeta(EMPTY_META);
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
      // Unrecognised boards (e.g. SQA) stay Custom with the inferred name as the label.
      setSubjectMeta((prev) => ({
        ...prev,
        board: boardFromText(draft.examBoard),
        exam: draft.examBoard === "Custom" ? "" : draft.examBoard,
      }));
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

  return (
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
          gridTemplateColumns: "minmax(0, 1fr) 52px auto",
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
      <div style={{ marginTop: "8px" }}>
        <SubjectMetaFields
          C={C}
          value={subjectMeta}
          onChange={(patch) => setSubjectMeta((prev) => ({ ...prev, ...patch }))}
        />
      </div>
      <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {SUBJECT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className="nb"
            onClick={() => {
              setSubjectName(preset.name);
              setSubjectMeta(presetMeta(preset));
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
              <>
                <div style={{ marginTop: "6px", fontSize: "10px", color: C.muted }}>
                  {specTopics.length} topic{specTopics.length === 1 ? "" : "s"} found
                </div>
                <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
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
              </>
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
  );
}
