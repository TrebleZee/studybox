import { useEffect, useState } from "react";
import { dateKey } from "../utils/gameLogic.js";
import { subjectLabel } from "../utils/subjects.js";

export default function EditSessionModal({ C, session, subjects, asanaCfg, onSave, onClose }) {
  const [editSubjectId, setEditSubjectId] = useState(session.subjectId);
  const [editDurationHours, setEditDurationHours] = useState(Math.floor(session.duration / 3600));
  const [editDurationMinutes, setEditDurationMinutes] = useState(
    Math.floor((session.duration % 3600) / 60)
  );
  const [editDate, setEditDate] = useState(dateKey(session.date) || "");
  const [editTags, setEditTags] = useState(session.tags || []);
  const [editTagInput, setEditTagInput] = useState("");
  const [editNote, setEditNote] = useState(session.note || "");

  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const save = () => {
    const known = subjects.find((s) => s.id === editSubjectId);
    const target =
      known ||
      (editSubjectId === asanaCfg.id
        ? { id: asanaCfg.id, name: asanaCfg.name, color: asanaCfg.color }
        : { id: editSubjectId, name: session.subjectName, color: session.subjectColor });

    let finalDate = session.date;
    if (editDate) {
      const original = new Date(session.date);
      const [y, m, d] = editDate.split("-").map(Number);
      finalDate = new Date(
        y,
        m - 1,
        d,
        original.getHours(),
        original.getMinutes(),
        original.getSeconds()
      ).toISOString();
    }

    onSave(session.id, {
      subjectId: target.id,
      subjectName: target.name,
      subjectColor: target.color,
      duration: editDurationHours * 3600 + editDurationMinutes * 60,
      date: finalDate,
      tags: editTags,
      note: editNote.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit study session"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        style={{
          background: C.s1,
          border: `1px solid ${C.bdr}`,
          borderRadius: "16px",
          padding: "20px",
          width: "100%",
          maxWidth: "380px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "14px" }}>Edit Study Session</span>
          <button
            type="button"
            onClick={() => onClose()}
            style={{
              border: "none",
              background: "transparent",
              color: C.muted,
              cursor: "pointer",
              fontSize: "18px",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Subject Select */}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label
            htmlFor="edit-subject-select"
            style={{ fontSize: "10px", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}
          >
            Subject
          </label>
          <select
            id="edit-subject-select"
            value={editSubjectId}
            onChange={(e) => setEditSubjectId(e.target.value)}
            style={{
              width: "100%",
              background: C.s2,
              color: C.txt,
              border: `1px solid ${C.bdr2}`,
              borderRadius: "8px",
              padding: "8px 10px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} ({subjectLabel(sub)})
              </option>
            ))}
            {(asanaCfg.enabled || session.subjectId === asanaCfg.id) && (
              <option value={asanaCfg.id}>
                {asanaCfg.name} ({asanaCfg.exam})
              </option>
            )}
          </select>
        </div>

        {/* Duration Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "10px", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Duration
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                min="0"
                value={editDurationHours}
                onChange={(e) => setEditDurationHours(Math.max(0, parseInt(e.target.value) || 0))}
                style={{
                  width: "100%",
                  background: C.s2,
                  color: C.txt,
                  border: `1px solid ${C.bdr2}`,
                  borderRadius: "8px",
                  padding: "8px 10px",
                  outline: "none",
                }}
              />
              <div style={{ fontSize: "9px", color: C.muted, marginTop: "2px" }}>Hours</div>
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                min="0"
                max="59"
                value={editDurationMinutes}
                onChange={(e) => setEditDurationMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                style={{
                  width: "100%",
                  background: C.s2,
                  color: C.txt,
                  border: `1px solid ${C.bdr2}`,
                  borderRadius: "8px",
                  padding: "8px 10px",
                  outline: "none",
                }}
              />
              <div style={{ fontSize: "9px", color: C.muted, marginTop: "2px" }}>Minutes</div>
            </div>
          </div>
        </div>

        {/* Date Picker */}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label
            htmlFor="edit-date-input"
            style={{ fontSize: "10px", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}
          >
            Date
          </label>
          <input
            id="edit-date-input"
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            style={{
              width: "100%",
              background: C.s2,
              color: C.txt,
              border: `1px solid ${C.bdr2}`,
              borderRadius: "8px",
              padding: "8px 10px",
              outline: "none",
            }}
          />
        </div>

        {/* Tags list and entry */}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "10px", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Tags (Press Enter to add)
          </label>
          <div
            style={{
              border: `1px solid ${C.bdr2}`,
              background: C.s2,
              borderRadius: "8px",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {editTags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {editTags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: C.s3,
                      color: C.txt,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setEditTags(editTags.filter((t) => t !== tag))}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: C.muted,
                        cursor: "pointer",
                        padding: 0,
                        fontSize: "12px",
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={editTagInput}
                onChange={(e) => setEditTagInput(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const tag = editTagInput.trim();
                    if (tag && !editTags.includes(tag)) {
                      setEditTags([...editTags, tag]);
                    }
                    setEditTagInput("");
                  }
                }}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: C.txt,
                  outline: "none",
                  fontSize: "12px",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const tag = editTagInput.trim();
                  if (tag && !editTags.includes(tag)) {
                    setEditTags([...editTags, tag]);
                  }
                  setEditTagInput("");
                }}
                style={{
                  background: C.s3,
                  border: `1px solid ${C.bdr2}`,
                  borderRadius: "4px",
                  padding: "2px 8px",
                  color: C.txt,
                  cursor: "pointer",
                  fontSize: "11px",
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Note text field */}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "10px", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Note
          </label>
          <input
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Optional session notes"
            style={{
              width: "100%",
              background: C.s2,
              color: C.txt,
              border: `1px solid ${C.bdr2}`,
              borderRadius: "8px",
              padding: "8px 10px",
              outline: "none",
            }}
          />
        </div>

        {/* Save / Cancel buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
          <button
            type="button"
            onClick={() => onClose()}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: `1px solid ${C.bdr2}`,
              background: "transparent",
              color: C.txt,
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "none",
              background: subjects.find((s) => s.id === editSubjectId)?.color || "#4F9CF9",
              color: "#000",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
