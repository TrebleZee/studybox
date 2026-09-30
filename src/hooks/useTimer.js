import { useEffect, useRef, useState } from "react";
import { loadJson, STORAGE_KEYS } from "../utils/storage.js";

const nonNegative = (value) => (Number.isFinite(value) && value >= 0 ? value : null);

// The timer is saved so a reload (an app update, a refresh, a closed tab)
// resumes the session instead of losing it.
const loadSavedTimer = () => {
  const saved = loadJson(STORAGE_KEYS.timer, null);
  return {
    elapsed: nonNegative(saved?.elapsed) ?? 0,
    startedAt: nonNegative(saved?.startedAt),
    timedSubjectId: typeof saved?.timedSubjectId === "string" ? saved.timedSubjectId : null,
  };
};

// The timer is anchored to a Date.now() start timestamp rather than counting
// ticks, so a backgrounded tab or a throttled interval can't make it drift.
export default function useTimer({ canTime, defaultSubjectId }) {
  const [saved] = useState(loadSavedTimer);
  const [elapsed, setElapsed] = useState(saved.elapsed);
  const [startedAt, setStartedAt] = useState(saved.startedAt);
  const [now, setNow] = useState(() => Date.now());
  const [timedSubjectId, setTimedSubjectId] = useState(saved.timedSubjectId);
  const intervalRef = useRef();

  const running = startedAt !== null;

  useEffect(() => {
    if (startedAt === null && elapsed === 0 && timedSubjectId === null) {
      localStorage.removeItem(STORAGE_KEYS.timer);
    } else {
      localStorage.setItem(
        STORAGE_KEYS.timer,
        JSON.stringify({ elapsed, startedAt, timedSubjectId })
      );
    }
  }, [elapsed, startedAt, timedSubjectId]);

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
