import { useId } from "react";

const button = (C, strong) => ({
  padding: "5px 10px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontWeight: strong ? 700 : 400,
  fontSize: "12px",
  background: strong ? C.s3 : "transparent",
  color: strong ? C.txt : C.muted,
  flexShrink: 0,
});

// "Deleted <name>. Undo" after a delete, or `message` instead ("Reset timer."
// after a timer Reset). One at a time: the app replaces it on the next
// delete or Reset and clears it when the view changes. Space on its buttons
// presses them rather than toggling the timer (data-own-keys).
export default function UndoBar({ C, name, message, onUndo, onDismiss }) {
  const labelId = useId();
  return (
    <div
      role="status"
      aria-labelledby={labelId}
      data-own-keys=""
      style={{
        pointerEvents: "auto",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 10px 8px 14px",
        background: C.s2,
        border: `1px solid ${C.bdr2}`,
        borderRadius: "8px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
        fontSize: "12px",
        color: C.txt,
        maxWidth: "100%",
      }}
    >
      <span id={labelId} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {message ?? `Deleted ${name}.`}
      </span>
      <button type="button" className="nb" onClick={onUndo} style={button(C, true)}>
        Undo
      </button>
      <button type="button" className="nb" onClick={onDismiss} aria-label="Dismiss" style={button(C, false)}>
        ×
      </button>
    </div>
  );
}
