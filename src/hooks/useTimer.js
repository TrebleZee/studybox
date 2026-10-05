import { useEffect, useRef, useState } from "react";
import { loadJson, removeKey, saveJson, STORAGE_KEYS } from "../store/index.js";

const nonNegative = (value) => (Number.isFinite(value) && value >= 0 ? value : null);

// A running timer only resumes by itself if it started recently on a sane
// clock. Anything older (a tab closed and forgotten for days) or implausible
// (a corrupted or future timestamp) comes back paused, so a forgotten session
// can't be logged as days of study.
const MAX_RESUME_MS = 12 * 60 * 60 * 1000;
const EARLIEST_START = Date.UTC(2020, 0, 1);

// The timer is saved so a reload (an app update, a refresh, a closed tab)
// resumes the session instead of losing it. `lastSeenAt` is a heartbeat
// written while the timer runs, marking when the app was last open.
const loadSavedTimer = (now) => {
  const saved = loadJson(STORAGE_KEYS.timer, null);
  const elapsed = nonNegative(saved?.elapsed) ?? 0;
  const timedSubjectId = typeof saved?.timedSubjectId === "string" ? saved.timedSubjectId : null;
  const startedAt = nonNegative(saved?.startedAt);
  if (startedAt === null) return { elapsed, startedAt: null, timedSubjectId };

  const plausible = startedAt >= EARLIEST_START && startedAt <= now;
  if (plausible && now - startedAt <= MAX_RESUME_MS) return { elapsed, startedAt, timedSubjectId };

  // Restore paused at the time the timer was actually seen running, or at the
  // last paused value when there's no trustworthy heartbeat.
  const lastSeenAt = nonNegative(saved?.lastSeenAt);
  const seenSecs =
    plausible && lastSeenAt !== null && lastSeenAt >= startedAt && lastSeenAt <= now
      ? Math.floor((lastSeenAt - startedAt) / 1000)
      : null;
  return { elapsed: seenSecs ?? elapsed, startedAt: null, timedSubjectId };
};

// The timer is anchored to a Date.now() start timestamp rather than counting
// ticks, so a backgrounded tab or a throttled interval can't make it drift.
export default function useTimer({ canTime, defaultSubjectId }) {
  const [saved] = useState(() => loadSavedTimer(Date.now()));
  const [elapsed, setElapsed] = useState(saved.elapsed);
  const [startedAt, setStartedAt] = useState(saved.startedAt);
  const [now, setNow] = useState(() => Date.now());
  const [timedSubjectId, setTimedSubjectId] = useState(saved.timedSubjectId);
  const intervalRef = useRef();

  const running = startedAt !== null;
  const lastSeenAt = running ? now : null;

  useEffect(() => {
    if (startedAt === null && elapsed === 0 && timedSubjectId === null) {
      removeKey(STORAGE_KEYS.timer);
    } else {
      saveJson(STORAGE_KEYS.timer, { elapsed, startedAt, timedSubjectId, lastSeenAt });
    }
  }, [elapsed, startedAt, timedSubjectId, lastSeenAt]);

  useEffect(() => {
    if (startedAt !== null) {
      intervalRef.current = setInterval(() => setNow(Date.now()), 500);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [startedAt]);

  useEffect(() => {
    if (!running) return undefined;
    const refresh = () => setNow(Date.now());
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [running]);

  const displaySecs = running ? Math.max(0, Math.floor((now - startedAt) / 1000)) : elapsed;

  const start = () => {
    if (!canTime) return;
    if (!timedSubjectId) setTimedSubjectId(defaultSubjectId);
    const startTime = Date.now();
    setNow(startTime);
    setStartedAt(startTime - elapsed * 1000);
  };

  const pause = () => {
    setElapsed(displaySecs);
    setStartedAt(null);
  };

  const reset = () => {
    setElapsed(0);
    setStartedAt(null);
    setTimedSubjectId(null);
  };

  return { running, displaySecs, timedSubjectId, setTimedSubjectId, start, pause, reset };
}
