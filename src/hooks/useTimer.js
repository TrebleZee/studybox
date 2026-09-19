import { useEffect, useRef, useState } from "react";

// The timer is anchored to a Date.now() start timestamp rather than counting
// ticks, so a backgrounded tab or a throttled interval can't make it drift.
export default function useTimer({ canTime, defaultSubjectId }) {
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [timedSubjectId, setTimedSubjectId] = useState(null);
  const intervalRef = useRef();

  const running = startedAt !== null;

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
