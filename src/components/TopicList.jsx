import { useState } from "react";
import { fmtDur } from "../utils/format.js";
import {
  groupTopicsByPaper,
  inTierTopics,
  subjectLabel,
  topicPapers,
} from "../utils/subjects.js";

const MULTI_PAPER = "__several__";

export default function TopicList({
  C,
  sub,
  loggedSecs,
  expandedTopic,
  setExpandedTopic,
  onToggleTopic,
  onAddTopic,
  onDeleteTopic,
  onUpdateTopic,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
}) {
  const [newTopic, setNewTopic] = useState("");
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [doneTopicsOpen, setDoneTopicsOpen] = useState(false);
  const [showHigher, setShowHigher] = useState(false);

  // Foundation GCSEs hide higher-only topics unless asked; every other
  // subject shows all of its topics.
  const inTier = inTierTopics(sub);
  const higherTopics = sub.tier === "foundation" ? sub.topics.filter((topic) => topic.higherOnly) : [];
  const topics = showHigher ? sub.topics : inTier;
  const openTopics = topics.filter((topic) => !topic.done);
  const doneTopics = topics.filter((topic) => topic.done);
  // Grouped by paper only when some topic has a paper; [] keeps the flat list.
  const groups = groupTopicsByPaper(sub, topics);
  const papers = sub.papers || [];
  const canSetHigher = sub.qualification === "gcse";

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

  const paperValue = (topic) => {
    const ids = topicPapers(topic);
    if (ids.length > 1) return MULTI_PAPER;
    return ids[0] || "";
  };

  const changePaper = (topic, value) => {
    if (value === MULTI_PAPER) return;
    onUpdateTopic(topic.id, { paper: value || undefined });
  };

  const renderTopicMeta = (topic) => {
    if (!papers.length && !canSetHigher) return null;
    const ids = topicPapers(topic);
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "10px",
          marginTop: "8px",
          fontSize: "11px",
          color: C.muted,
        }}
      >
        {papers.length > 0 && (
          <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            Paper
            <select
              value={paperValue(topic)}
              onChange={(e) => changePaper(topic, e.target.value)}
              aria-label={`Paper for ${topic.name}`}
              style={{
                background: C.s2,
                border: `1px solid ${C.bdr2}`,
                borderRadius: "6px",
                padding: "3px 6px",
                color: C.txt,
                fontSize: "11px",
              }}
            >
              <option value="">No paper</option>
              {ids.length > 1 && (
                <option value={MULTI_PAPER}>
                  {ids
                    .map((id) => papers.find((paper) => paper.id === id)?.name || id)
                    .join(" & ")}
                </option>
              )}
              {papers.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {canSetHigher && (
          <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={Boolean(topic.higherOnly)}
              onChange={(e) => onUpdateTopic(topic.id, { higherOnly: e.target.checked || undefined })}
              aria-label={`Higher tier only: ${topic.name}`}
            />
            Higher tier only
          </label>
        )}
      </div>
    );
  };

  const renderOpenTopic = (topic) => (
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
        {topic.higherOnly && (
          <span
            style={{
              fontSize: "9px",
              color: C.muted,
              border: `1px solid ${C.bdr2}`,
              borderRadius: "4px",
              padding: "1px 5px",
              flexShrink: 0,
            }}
          >
            Higher
          </span>
        )}
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
          {renderTopicMeta(topic)}
        </div>
      )}
    </div>
  );

  const renderGroup = (group) => {
    // Progress counts the group's in-tier topics, whether or not higher-only
    // topics are currently shown.
    const counted = group.topics.filter((topic) => inTier.includes(topic));
    const done = counted.filter((topic) => topic.done).length;
    const pct = counted.length ? Math.round((done / counted.length) * 100) : 0;
    const open = group.topics.filter((topic) => !topic.done);
    return (
      <section key={group.key} aria-label={`${group.name} topics`}>
        <div style={{ padding: "10px 16px 4px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "8px",
              fontSize: "10px",
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            <span style={{ flex: 1 }}>{group.name}</span>
            <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>
              {done}/{counted.length}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`${group.name} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            style={{
              marginTop: "5px",
              height: "3px",
              borderRadius: "2px",
              background: C.s3,
              overflow: "hidden",
            }}
          >
            <div style={{ width: `${pct}%`, height: "100%", background: sub.color }} />
          </div>
        </div>
        {open.map(renderOpenTopic)}
      </section>
    );
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
            {subjectLabel(sub)}
          </span>
          <span style={{ fontSize: "11px", color: C.muted, marginLeft: "auto" }}>
            {inTier.filter((topic) => topic.done).length}/{inTier.length} done
            {" · "}
            {fmtDur(loggedSecs)} logged
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {higherTopics.length > 0 && (
            <div
              style={{
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "11px",
                color: C.muted,
                borderBottom: `1px solid ${C.bdr}`,
              }}
            >
              <span style={{ flex: 1 }}>
                Foundation tier: {higherTopics.length} higher-tier topic
                {higherTopics.length === 1 ? " is" : "s are"} {showHigher ? "shown" : "hidden"}.
              </span>
              <button
                className="nb"
                type="button"
                aria-pressed={showHigher}
                onClick={() => setShowHigher((prev) => !prev)}
                style={{
                  border: `1px solid ${C.bdr2}`,
                  background: C.s2,
                  color: C.txt,
                  borderRadius: "6px",
                  padding: "3px 8px",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
              >
                Show higher-tier topics
              </button>
            </div>
          )}
          {topics.length === 0 && (
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
          {groups.length > 0 ? groups.map(renderGroup) : openTopics.map(renderOpenTopic)}
          {topics.length > 0 &&
            topics.every((topic) => topic.done) && (
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
          {doneTopics.length > 0 && (
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
                  Completed ({doneTopics.length})
                </span>
                <span style={{ fontSize: "9px" }}>
                  {doneTopicsOpen ? "▾" : "▸"}
                </span>
              </button>
              {doneTopicsOpen &&
                doneTopics
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
