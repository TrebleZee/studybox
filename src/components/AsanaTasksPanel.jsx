import { useEffect, useState } from "react";
import {
  getAsanaTasks,
  getSubtasks,
  hasAsanaToken,
  setAsanaToken,
  setTaskCompleted,
} from "../services/asanaClient.js";

const fmtDue = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

const isNetworkError = (err) =>
  err instanceof TypeError || /fetch|network/i.test(err?.message || "");

const byDueDate = (a, b) => {
  if (a.dueOn && b.dueOn) return a.dueOn.localeCompare(b.dueOn);
  if (a.dueOn) return -1;
  if (b.dueOn) return 1;
  return 0;
};

export default function AsanaTasksPanel({ C, cfg, onStats, selectedGid, onSelectTask }) {
  const [connected, setConnected] = useState(() => hasAsanaToken());
  const [tokenDraft, setTokenDraft] = useState("");
  const [tasks, setTasks] = useState(null);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [fetchTick, setFetchTick] = useState(0);
  const [subtasksByGid, setSubtasksByGid] = useState({});
  const [completedOpen, setCompletedOpen] = useState(false);
  const [busyGid, setBusyGid] = useState(null);

  const loading = connected && tasks === null && !error;

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    getAsanaTasks(cfg.projectGid)
      .then((result) => {
        if (cancelled) return;
        setTasks(result.tasks);
        setCompletedTasks(result.completedTasks);
        setStats(result.stats);
        onStats(result.stats);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          isNetworkError(err)
            ? "Network error reaching Asana. Check your connection."
            : err.message.includes("401")
              ? "Asana rejected the token. Disconnect and paste a new one."
              : "Couldn't load tasks from Asana."
        );
      });
    return () => {
      cancelled = true;
    };
  }, [connected, fetchTick, cfg.projectGid, onStats]);

  const load = () => {
    setTasks(null);
    setCompletedTasks([]);
    setError(null);
    setActionError(null);
    setSubtasksByGid({});
    setFetchTick((tick) => tick + 1);
  };

  const connect = () => {
    const token = tokenDraft.trim();
    if (!token) return;
    setAsanaToken(token);
    setTokenDraft("");
    setConnected(true);
  };

  const disconnect = () => {
    setAsanaToken(null);
    setConnected(false);
    setTasks(null);
    setCompletedTasks([]);
    setStats(null);
    setError(null);
    setActionError(null);
    setSubtasksByGid({});
    onStats(null);
    onSelectTask(null);
  };

  const selectTask = (task) => {
    if (selectedGid === task.gid) {
      onSelectTask(null);
      return;
    }
    onSelectTask({ gid: task.gid, name: task.name });
    if (!subtasksByGid[task.gid]) {
      setSubtasksByGid((prev) => ({
        ...prev,
        [task.gid]: { loading: true, items: null, failed: false },
      }));
      getSubtasks(task.gid)
        .then((items) =>
          setSubtasksByGid((prev) => ({
            ...prev,
            [task.gid]: { loading: false, items, failed: false },
          }))
        )
        .catch(() =>
          setSubtasksByGid((prev) => ({
            ...prev,
            [task.gid]: { loading: false, items: null, failed: true },
          }))
        );
    }
  };

  const toggleTask = (task) => {
    if (busyGid) return;
    const next = !task.completed;
    setBusyGid(task.gid);
    setActionError(null);
    setTaskCompleted(task.gid, next)
      .then(() => {
        if (next) {
          setTasks((prev) => prev.filter((t) => t.gid !== task.gid));
          setCompletedTasks((prev) =>
            [...prev, { ...task, completed: true, overdue: false }].sort(byDueDate)
          );
          if (selectedGid === task.gid) onSelectTask(null);
        } else {
          setCompletedTasks((prev) => prev.filter((t) => t.gid !== task.gid));
          setTasks((prev) =>
            [
              ...prev,
              {
                ...task,
                completed: false,
                overdue: task.dueOn
                  ? new Date(task.dueOn) < new Date(new Date().toDateString())
                  : false,
              },
            ].sort(byDueDate)
          );
        }
        const nextStats = stats
          ? { completed: stats.completed + (next ? 1 : -1), total: stats.total }
          : null;
        setStats(nextStats);
        onStats(nextStats);
      })
      .catch((err) =>
        setActionError(
          isNetworkError(err)
            ? "Network error updating the task in Asana."
            : "Couldn't update the task in Asana."
        )
      )
      .finally(() => setBusyGid(null));
  };

  const toggleSubtask = (parentGid, subtask) => {
    if (busyGid) return;
    const next = !subtask.completed;
    setBusyGid(subtask.gid);
    setActionError(null);
    setTaskCompleted(subtask.gid, next)
      .then(() =>
        setSubtasksByGid((prev) => ({
          ...prev,
          [parentGid]: {
            ...prev[parentGid],
            items: prev[parentGid].items.map((st) =>
              st.gid === subtask.gid ? { ...st, completed: next } : st
            ),
          },
        }))
      )
      .catch((err) =>
        setActionError(
          isNetworkError(err)
            ? "Network error updating the subtask in Asana."
            : "Couldn't update the subtask in Asana."
        )
      )
      .finally(() => setBusyGid(null));
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
            background: cfg.color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 700, fontSize: "14px" }}>{cfg.name}</span>
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
          {cfg.exam}
        </span>
        {connected && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
            {tasks && stats && (
              <span style={{ fontSize: "11px", color: C.muted, marginRight: "4px" }}>
                {stats.completed}/{stats.total} done · {tasks.length} open
              </span>
            )}
            <button
              className="nb"
              onClick={load}
              disabled={loading}
              style={{
                padding: "5px 11px",
                borderRadius: "6px",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "11px",
                fontWeight: 500,
                background: C.s3,
                color: loading ? C.muted : C.txt,
              }}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              className="nb"
              onClick={disconnect}
              style={{
                padding: "5px 11px",
                borderRadius: "6px",
                border: `1px solid ${C.bdr2}`,
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 500,
                background: "transparent",
                color: C.muted,
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {!connected && (
          <div style={{ padding: "40px 16px", maxWidth: "360px", margin: "0 auto" }}>
            <div
              style={{
                fontSize: "12px",
                color: C.muted,
                lineHeight: 1.6,
                marginBottom: "12px",
                textAlign: "center",
              }}
            >
              Paste an Asana personal access token to see open NEA tracker tasks
              here, ordered by due date. It's stored only in this browser.
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="password"
                value={tokenDraft}
                onChange={(e) => setTokenDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && connect()}
                placeholder="Asana token"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: C.s2,
                  border: `1px solid ${C.bdr2}`,
                  borderRadius: "6px",
                  padding: "7px 10px",
                  color: C.txt,
                  outline: "none",
                }}
              />
              <button
                className="nb"
                onClick={connect}
                disabled={!tokenDraft.trim()}
                style={{
                  padding: "7px 14px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: tokenDraft.trim() ? "pointer" : "not-allowed",
                  fontWeight: 700,
                  fontSize: "12px",
                  background: tokenDraft.trim() ? cfg.color : C.s3,
                  color: tokenDraft.trim() ? "#000" : C.muted,
                }}
              >
                Connect
              </button>
            </div>
          </div>
        )}

        {connected && loading && (
          <div style={{ padding: "40px 16px", textAlign: "center", color: C.muted, fontSize: "12px" }}>
            Loading tasks...
          </div>
        )}

        {connected && error && (
          <div style={{ padding: "40px 16px", textAlign: "center", color: "#f87171", fontSize: "12px" }}>
            {error}
          </div>
        )}

        {connected && !error && actionError && (
          <div style={{ padding: "8px 16px 0", fontSize: "11px", color: "#f87171" }}>
            {actionError}
          </div>
        )}

        {connected && !error && !loading && tasks && tasks.length === 0 && (
          <div style={{ padding: "40px 16px", textAlign: "center", color: C.muted, fontSize: "12px" }}>
            No open tasks. Nice.
          </div>
        )}

        {connected && !error && tasks && tasks.length > 0 && (
          <>
            <div style={{ padding: "8px 16px 4px", fontSize: "11px", color: C.muted }}>
              Select a task to log study time against it with the timer, or tick
              it off to complete it in Asana.
            </div>
            {tasks.map((task) => {
              const selected = task.gid === selectedGid;
              const sub = subtasksByGid[task.gid];
              return (
                <div key={task.gid}>
                  <div
                    className="asana-row"
                    onClick={() => selectTask(task)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "7px 16px",
                      gap: "10px",
                      cursor: "pointer",
                      background: selected ? `${cfg.color}18` : "transparent",
                      borderLeft: `3px solid ${selected ? cfg.color : "transparent"}`,
                      transition: "background 0.1s",
                    }}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(task);
                      }}
                      aria-label={`Complete task ${task.name}`}
                      role="checkbox"
                      aria-checked={false}
                      style={{
                        width: "15px",
                        height: "15px",
                        borderRadius: "4px",
                        flexShrink: 0,
                        border: `1.5px solid ${C.dim}`,
                        background: "transparent",
                        cursor: busyGid ? "wait" : "pointer",
                        opacity: busyGid === task.gid ? 0.5 : 1,
                        transition: "all 0.15s",
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: "13px",
                        fontWeight: selected ? 600 : 400,
                        color: task.overdue
                          ? "#f87171"
                          : selected
                            ? cfg.color
                            : C.txt,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {task.name}
                    </span>
                    <span style={{ fontSize: "10px", color: C.muted, flexShrink: 0 }}>
                      {task.section}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: task.overdue ? "#f87171" : C.muted,
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                        minWidth: "72px",
                        textAlign: "right",
                      }}
                    >
                      {task.dueOn
                        ? `${task.overdue ? "overdue " : ""}${fmtDue(task.dueOn)}`
                        : "no due date"}
                    </span>
                    <a
                      href={task.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Open ${task.name} in Asana`}
                      style={{
                        color: C.muted,
                        textDecoration: "none",
                        fontSize: "12px",
                        flexShrink: 0,
                        padding: "0 2px",
                      }}
                    >
                      ↗
                    </a>
                  </div>
                  {selected && (
                    <div style={{ padding: "0 16px 8px 44px" }}>
                      {(!sub || sub.loading) && (
                        <div style={{ fontSize: "11px", color: C.muted, padding: "3px 0" }}>
                          Loading subtasks...
                        </div>
                      )}
                      {sub && sub.failed && (
                        <div style={{ fontSize: "11px", color: "#f87171", padding: "3px 0" }}>
                          Couldn't load subtasks.
                        </div>
                      )}
                      {sub && sub.items && sub.items.length === 0 && (
                        <div style={{ fontSize: "11px", color: C.muted, padding: "3px 0" }}>
                          No subtasks.
                        </div>
                      )}
                      {sub &&
                        sub.items &&
                        sub.items.map((st) => (
                          <div
                            key={st.gid}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "4px 0",
                            }}
                          >
                            <div
                              onClick={() => toggleSubtask(task.gid, st)}
                              aria-label={`Complete subtask ${st.name}`}
                              role="checkbox"
                              aria-checked={st.completed}
                              style={{
                                width: "13px",
                                height: "13px",
                                borderRadius: "4px",
                                flexShrink: 0,
                                border: `1.5px solid ${st.completed ? cfg.color : C.dim}`,
                                background: st.completed ? cfg.color : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: busyGid ? "wait" : "pointer",
                                opacity: busyGid === st.gid ? 0.5 : 1,
                                transition: "all 0.15s",
                              }}
                            >
                              {st.completed && (
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
                                color: st.completed ? C.muted : C.txt,
                                textDecoration: st.completed ? "line-through" : "none",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {st.name}
                            </span>
                            {st.dueOn && (
                              <span style={{ fontSize: "10px", color: C.muted, flexShrink: 0 }}>
                                {fmtDue(st.dueOn)}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {connected && !error && !loading && completedTasks.length > 0 && (
          <div style={{ borderTop: `1px solid ${C.bdr}`, marginTop: "6px" }}>
            <button
              className="nb"
              onClick={() => setCompletedOpen((prev) => !prev)}
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
              <span>Completed ({completedTasks.length})</span>
              <span style={{ fontSize: "9px" }}>{completedOpen ? "▾" : "▸"}</span>
            </button>
            {completedOpen &&
              completedTasks.map((task) => (
                <div
                  key={task.gid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "6px 16px",
                    gap: "10px",
                  }}
                >
                  <div
                    onClick={() => toggleTask(task)}
                    aria-label={`Reopen task ${task.name}`}
                    role="checkbox"
                    aria-checked={true}
                    style={{
                      width: "15px",
                      height: "15px",
                      borderRadius: "4px",
                      flexShrink: 0,
                      border: `1.5px solid ${cfg.color}`,
                      background: cfg.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: busyGid ? "wait" : "pointer",
                      opacity: busyGid === task.gid ? 0.5 : 1,
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
                      fontSize: "13px",
                      color: C.muted,
                      textDecoration: "line-through",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.name}
                  </span>
                  <a
                    href={task.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${task.name} in Asana`}
                    style={{
                      color: C.muted,
                      textDecoration: "none",
                      fontSize: "12px",
                      flexShrink: 0,
                      padding: "0 2px",
                    }}
                  >
                    ↗
                  </a>
                </div>
              ))}
          </div>
        )}
      </div>
    </>
  );
}
