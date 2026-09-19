import { useState } from "react";
import { fmtDur } from "../utils/format.js";

export default function TopicList({
  C,
  sub,
  loggedSecs,
  expandedTopic,
  setExpandedTopic,
  onToggleTopic,
  onAddTopic,
  onDeleteTopic,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
}) {
  const [newTopic, setNewTopic] = useState("");
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [doneTopicsOpen, setDoneTopicsOpen] = useState(false);

  const submitTopic = () => {
    if (!newTopic.trim()) return;
    onAddTopic(newTopic);
    setNewTopic("");
  };

  const submitSubtask = (topicId) => {
    if (!subtaskDraft.trim()) return;
    onAddSubtask(topicId, subtaskDraft);
    setSubtaskDraft("");
  };

  return (
    <>
        <div
          style={{
            padding: "11px 16px",
            borderBottom: `1px solid ${C.bdr}`,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: sub.color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 700, fontSize: "14px" }}>{sub.name}</span>
          <span
            style={{
              fontSize: "10px",
              color: C.muted,
              padding: "2px 7px",
              background: C.s2,
              borderRadius: "4px",
              border: `1px solid ${C.bdr2}`,
            }}
          >
            {sub.exam}
          </span>
          <span style={{ fontSize: "11px", color: C.muted, marginLeft: "auto" }}>
            {sub.topics.filter((topic) => topic.done).length}/{sub.topics.length} done
            {" · "}
            {fmtDur(loggedSecs)} logged
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {sub.topics.length === 0 && (
            <div
              style={{
                padding: "40px 16px",
                textAlign: "center",
                color: C.muted,
                fontSize: "12px",
              }}
            >
              No topics yet. Add one below.
            </div>
          )}
          {sub.topics
            .filter((topic) => !topic.done)
            .map((topic) => (
              <div key={topic.id}>
                <div
                  className="topic-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "7px 16px",
                    gap: "10px",
                    transition: "background 0.1s",
                    background:
                      expandedTopic === topic.id ? C.s2 : "transparent",
                  }}
                >
                  <div
                    onClick={() => {
                      onToggleTopic(topic.id);
                      if (expandedTopic === topic.id) setExpandedTopic(null);
                    }}
                    aria-label={`Complete topic ${topic.name}`}
                    role="checkbox"
                    aria-checked={false}
                    style={{
                      width: "15px",
                      height: "15px",
                      borderRadius: "4px",
                      flexShrink: 0,
                      border: `1.5px solid ${C.dim}`,
                      background: "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  />
                  <span
                    onClick={() =>
                      setExpandedTopic((prev) =>
                        prev === topic.id ? null : topic.id
                      )
                    }
                    style={{
                      flex: 1,
                      color: C.txt,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    {topic.name}
                  </span>
                  {topic.subtasks.length > 0 && (
                    <span style={{ fontSize: "10px", color: C.muted, flexShrink: 0 }}>
                      {topic.subtasks.filter((subtask) => subtask.done).length}/
                      {topic.subtasks.length}
                    </span>
                  )}
                  <span
                    onClick={() =>
                      setExpandedTopic((prev) =>
                        prev === topic.id ? null : topic.id
                      )
                    }
                    style={{
                      fontSize: "9px",
                      color: C.muted,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {expandedTopic === topic.id ? "▾" : "▸"}
                  </span>
                  <button
                    className="del nb"
                    onClick={() => onDeleteTopic(topic.id)}
                    aria-label={`Delete topic ${topic.name}`}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: C.muted,
                      cursor: "pointer",
                      fontSize: "17px",
                      lineHeight: 1,
                      opacity: 0,
                      transition: "opacity 0.1s",
                      padding: "0 2px",
                    }}
                  >
                    x
                  </button>
                </div>
                {expandedTopic === topic.id && (
                  <div style={{ padding: "2px 16px 8px 41px" }}>
                    {topic.subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="topic-row"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "4px 0",
                        }}
                      >
                        <div
                          onClick={() => onToggleSubtask(topic.id, subtask.id)}
                          aria-label={`Complete subtask ${subtask.name}`}
                          role="checkbox"
                          aria-checked={subtask.done}
                          style={{
                            width: "13px",
                            height: "13px",
                            borderRadius: "4px",
                            flexShrink: 0,
                            border: `1.5px solid ${subtask.done ? sub.color : C.dim}`,
                            background: subtask.done ? sub.color : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {subtask.done && (
                            <svg width="8" height="6" viewBox="0 0 9 7" fill="none">
                              <path
                                d="M1 3.5l2.5 2.5 4.5-5"
                                stroke="#000"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <span
                          style={{
                            flex: 1,
                            fontSize: "12px",
                            color: subtask.done ? C.muted : C.txt,
                            textDecoration: subtask.done ? "line-through" : "none",
                          }}
                        >
                          {subtask.name}
                        </span>
                        <button
                          className="del nb"
                          onClick={() => onDeleteSubtask(topic.id, subtask.id)}
                          aria-label={`Delete subtask ${subtask.name}`}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: C.muted,
                            cursor: "pointer",
                            fontSize: "14px",
                            lineHeight: 1,
                            opacity: 0,
                            transition: "opacity 0.1s",
                            padding: "0 2px",
                          }}
                        >
                          x
                        </button>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: "5px", marginTop: "4px" }}>
                      <input
                        value={subtaskDraft}
                        onChange={(e) => setSubtaskDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitSubtask(topic.id)}
                        placeholder="Add subtask"
                        style={{
                          flex: 1,
                          background: C.s2,
                          border: `1px solid ${C.bdr2}`,
                          borderRadius: "6px",
                          padding: "5px 8px",
                          color: C.txt,
                          outline: "none",
                          fontSize: "12px",
                        }}
                      />
                      <button
                        className="nb"
                        onClick={() => submitSubtask(topic.id)}
                        aria-label={`Add subtask to ${topic.name}`}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "11px",
                          background: C.s3,
                          color: C.txt,
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          {sub.topics.length > 0 &&
            sub.topics.every((topic) => topic.done) && (
              <div
                style={{
                  padding: "14px 16px",
                  textAlign: "center",
                  color: C.muted,
                  fontSize: "12px",
                }}
              >
                All topics done. Nice.
              </div>
            )}
          {sub.topics.some((topic) => topic.done) && (
            <div style={{ borderTop: `1px solid ${C.bdr}`, marginTop: "6px" }}>
              <button
                className="nb"
                onClick={() => setDoneTopicsOpen((prev) => !prev)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 16px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                <span>
                  Completed ({sub.topics.filter((topic) => topic.done).length})
                </span>
                <span style={{ fontSize: "9px" }}>
                  {doneTopicsOpen ? "▾" : "▸"}
                </span>
              </button>
              {doneTopicsOpen &&
                sub.topics
                  .filter((topic) => topic.done)
                  .map((topic) => (
                    <div
                      key={topic.id}
                      className="topic-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "6px 16px",
                        gap: "10px",
                        transition: "background 0.1s",
                        background: "transparent",
                      }}
                    >
                      <div
                        onClick={() => onToggleTopic(topic.id)}
                        aria-label={`Reopen topic ${topic.name}`}
                        role="checkbox"
                        aria-checked={true}
                        style={{
                          width: "15px",
                          height: "15px",
                          borderRadius: "4px",
                          flexShrink: 0,
                          border: `1.5px solid ${sub.color}`,
                          background: sub.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path
                            d="M1 3.5l2.5 2.5 4.5-5"
                            stroke="#000"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <span
                        style={{
                          flex: 1,
                          color: C.muted,
                          textDecoration: "line-through",
                          fontSize: "13px",
                        }}
                      >
                        {topic.name}
                      </span>
                      <button
                        className="del nb"
                        onClick={() => onDeleteTopic(topic.id)}
                        aria-label={`Delete topic ${topic.name}`}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: C.muted,
                          cursor: "pointer",
                          fontSize: "17px",
                          lineHeight: 1,
                          opacity: 0,
                          transition: "opacity 0.1s",
                          padding: "0 2px",
                        }}
                      >
                        x
                      </button>
                    </div>
                  ))}
            </div>
          )}
        </div>
        <div
          style={{
            padding: "9px 16px",
            borderTop: `1px solid ${C.bdr}`,
            display: "flex",
            gap: "6px",
            flexShrink: 0,
          }}
        >
          <input
            style={{
              flex: 1,
              background: C.s2,
              border: `1px solid ${C.bdr2}`,
              borderRadius: "6px",
              padding: "7px 10px",
              color: C.txt,
              outline: "none",
            }}
            placeholder={`Add topic to ${sub.name}...`}
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitTopic()}
          />
          <button
            className="nb"
            onClick={submitTopic}
            aria-label="Add topic"
            style={{
              padding: "7px 14px",
              background: sub.color,
              border: "none",
              borderRadius: "6px",
              color: "#000",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
    </>
  );
}
