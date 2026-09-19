import { useState } from "react";
import { fmt, fmtDur } from "../utils/format.js";
import { addUniqueTag } from "../utils/subjects.js";

const SESSION_TAG_SUGGESTIONS = [
  "Past papers",
  "Blurting",
  "Recap",
  "Flashcards",
  "Practice questions",
  "Timed set",
];

export default function TimerPanel({
  C,
  subjects,
  running,
  displaySecs,
  canTime,
  timerColor,
  timerLabel,
  highlightedSubjectId,
  asanaCfg,
  asanaSelected,
  subTotal,
  note,
  setNote,
  sessionTags,
  setSessionTags,
  onStart,
  onPause,
  onReset,
  onLog,
}) {
  const [tagDraft, setTagDraft] = useState("");
  const addTag = (raw) => {
    const next = raw.trim();
    if (!next) return;
    setSessionTags((prev) => addUniqueTag(prev, next));
    setTagDraft("");
  };
  const removeTag = (tag) => setSessionTags((prev) => prev.filter((item) => item !== tag));
  const clearTags = () => setSessionTags([]);

  return (
    <div
      style={{
        width: "250px",
        borderLeft: `1px solid ${C.bdr}`,
        background: C.s1,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "11px 13px 8px",
          fontSize: "10px",
          fontWeight: 600,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: "1px",
          borderBottom: `1px solid ${C.bdr}`,
        }}
      >
        Timer
      </div>
      <div style={{ padding: "18px 13px 12px", textAlign: "center" }}>
        <div
          className={running ? "ticking" : ""}
          style={{
            fontSize: "40px",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-2px",
            color: timerColor,
            lineHeight: 1,
          }}
        >
          {fmt(displaySecs)}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: C.muted,
            marginTop: "5px",
            height: "14px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {timerLabel}
        </div>
      </div>
      <div style={{ display: "flex", gap: "5px", padding: "0 13px", marginBottom: "8px" }}>
        {!running ? (
          <button
            className="nb"
            onClick={onStart}
            disabled={!canTime}
            style={{
              flex: 2,
              padding: "8px 0",
              borderRadius: "6px",
              border: "none",
              cursor: canTime ? "pointer" : "not-allowed",
              fontWeight: 700,
              fontSize: "12px",
              background: canTime ? timerColor : C.s3,
              color: canTime ? "#000" : C.muted,
            }}
          >
            {displaySecs > 0 ? "Resume" : "Start"}
          </button>
        ) : (
          <button
            className="nb"
            onClick={onPause}
            style={{
              flex: 2,
              padding: "8px 0",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "12px",
              background: timerColor,
              color: "#000",
            }}
          >
            Pause
          </button>
        )}
        <button
          className="nb"
          onClick={onReset}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: "12px",
            background: C.s3,
            color: C.muted,
          }}
        >
          Reset
        </button>
      </div>
      <textarea
        rows={2}
        placeholder="Session note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{
          margin: "0 13px 8px",
          background: C.s2,
          border: `1px solid ${C.bdr2}`,
          borderRadius: "6px",
          padding: "7px 9px",
          color: C.txt,
          outline: "none",
          resize: "none",
          fontFamily: "inherit",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      />

      <div style={{ padding: "0 13px 8px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "6px",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Session Tags
          </span>
          <button
            className="nb"
            onClick={clearTags}
            disabled={!sessionTags.length}
            style={{
              border: "none",
              background: "transparent",
              color: sessionTags.length ? C.txt : C.muted,
              cursor: sessionTags.length ? "pointer" : "not-allowed",
              fontSize: "11px",
              padding: 0,
            }}
          >
            Clear
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          {sessionTags.length === 0 ? (
            <span style={{ color: C.muted, fontSize: "11px", lineHeight: 1.5 }}>
              Add tags like past papers, blurting, or recap.
            </span>
          ) : (
            sessionTags.map((tag) => (
              <button
                key={tag}
                className="nb"
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
                style={{
                  border: `1px solid ${C.bdr2}`,
                  background: C.s2,
                  color: C.txt,
                  borderRadius: "999px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
              >
                {tag} x
              </button>
            ))
          )}
        </div>

        <div style={{ display: "flex", gap: "5px", marginTop: "8px" }}>
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagDraft);
              }
            }}
            placeholder="Add tag"
            style={{
              flex: 1,
              background: C.s2,
              border: `1px solid ${C.bdr2}`,
              borderRadius: "6px",
              padding: "7px 9px",
              color: C.txt,
              outline: "none",
            }}
          />
          <button
            className="nb"
            onClick={() => addTag(tagDraft)}
            aria-label="Add session tag"
            style={{
              padding: "7px 11px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "12px",
              background: C.s3,
              color: C.txt,
            }}
          >
            Add
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "8px" }}>
          {SESSION_TAG_SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              className="nb"
              onClick={() => setSessionTags((prev) => addUniqueTag(prev, tag))}
              style={{
                padding: "4px 8px",
                borderRadius: "999px",
                border: `1px solid ${C.bdr2}`,
                background: C.s2,
                color: C.muted,
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <button
        className="nb"
        onClick={onLog}
        disabled={!displaySecs || !canTime}
        style={{
          margin: "0 13px 13px",
          padding: "9px 0",
          background: displaySecs && canTime ? timerColor : C.s3,
          border: "none",
          borderRadius: "6px",
          color: displaySecs && canTime ? "#000" : C.muted,
          fontWeight: 700,
          fontSize: "12px",
          cursor: displaySecs && canTime ? "pointer" : "not-allowed",
          transition: "all 0.15s",
        }}
      >
        Log Session
      </button>

      <div
        style={{
          padding: "6px 13px 4px",
          fontSize: "10px",
          fontWeight: 600,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        Hours by Subject
      </div>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "8px" }}>
        {subjects.map((subject) => (
          <div
            key={subject.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "5px 13px",
              gap: "7px",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: subject.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: "12px",
                color: subject.id === highlightedSubjectId ? subject.color : C.txt,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subject.name}
            </span>
            <span style={{ fontSize: "11px", color: C.muted, fontVariantNumeric: "tabular-nums" }}>
              {fmtDur(subTotal(subject.id))}
            </span>
          </div>
        ))}
        {subTotal(asanaCfg.id) > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "5px 13px",
              gap: "7px",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: asanaCfg.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: "12px",
                color: asanaSelected ? asanaCfg.color : C.txt,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {asanaCfg.name}
            </span>
            <span style={{ fontSize: "11px", color: C.muted, fontVariantNumeric: "tabular-nums" }}>
              {fmtDur(subTotal(asanaCfg.id))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
