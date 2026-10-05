import { useEffect, useRef, useState } from "react";
import { loadJson, removeKey, saveJson, STORAGE_KEYS, subscribe } from "../store/index.js";
import { fmt } from "../utils/format.js";
import { newId } from "../utils/records.js";

const nonNegative = (value) => (Number.isFinite(value) && value >= 0 ? value : null);

// A running timer only resumes by itself if it started recently on a sane
// clock. Anything older (a tab closed and forgotten for days) or implausible
// (a corrupted or future timestamp) comes back paused, so a forgotten session
// can't be logged as days of study.
const MAX_RESUME_MS = 12 * 60 * 60 * 1000;
const EARLIEST_START = Date.UTC(2020, 0, 1);

// One tab owns a timer with time on it (N12). The owner stamps the saved
// timer with its tab id (`owner`) and a heartbeat (`heldAt`): every tick while
// it runs, every HEARTBEAT_MS while it's paused. Another tab leaves a timer
// alone while its owner's heartbeat is younger than STALE_MS (background tabs
// can be throttled to a tick a minute), so there's never a second writer to
// put a logged session back. A page that closes or reloads releases its timer
// (`owner: null`) on pagehide or unmount: the reloading page takes it straight back, and
// any other open tab only after RELEASE_GRACE_MS, in case it was a reload.
const HEARTBEAT_MS = 10 * 1000;
const STALE_MS = 3 * 60 * 1000;
const RELEASE_GRACE_MS = 5 * 1000;
const POLL_MS = 5 * 1000;

const hasTime = (saved) => nonNegative(saved?.startedAt) !== null || nonNegative(saved?.elapsed) > 0;

// Whether the saved timer is a live session another tab owns. A timer saved
// before owners existed, or with nothing on it, is nobody's.
export const ownedElsewhere = (saved, tabId, now, graceMs = 0) => {
  if (!hasTime(saved) || saved.owner === tabId) return false;
  const heldAt = nonNegative(saved.heldAt);
  if (heldAt === null || heldAt > now) return false;
  return now - heldAt < (typeof saved.owner === "string" ? STALE_MS : graceMs);
};

// The timer is saved so a reload (an app update, a refresh, a closed tab)
// resumes the session instead of losing it. `lastSeenAt` is a heartbeat
// written while the timer runs, marking when the app was last open.
const savedTimer = (saved, now) => {
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

const IDLE = { elapsed: 0, startedAt: null, timedSubjectId: null };

// The timer is anchored to a Date.now() start timestamp rather than counting
// ticks, so a backgrounded tab or a throttled interval can't make it drift.
export default function useTimer({ canTime, defaultSubjectId }) {
  const [tabId] = useState(() => newId("tab"));
  const [initial] = useState(() => {
    const saved = loadJson(STORAGE_KEYS.timer, null);
    const now = Date.now();
    return ownedElsewhere(saved, tabId, now) ? { ...IDLE, elsewhere: true } : { ...savedTimer(saved, now), elsewhere: false };
  });
  const [elapsed, setElapsed] = useState(initial.elapsed);
  const [startedAt, setStartedAt] = useState(initial.startedAt);
  const [now, setNow] = useState(() => Date.now());
  const [timedSubjectId, setTimedSubjectId] = useState(initial.timedSubjectId);
  // Another tab owns the session in progress: this tab shows it as elsewhere
  // and never writes the timer until it's free or the user continues it here.
  const [elsewhere, setElsewhere] = useState(initial.elsewhere);
  const written = useRef(null);

  const running = startedAt !== null;
  const lastSeenAt = running ? now : null;
  const holding = !elsewhere && (running || elapsed > 0);
  const heldAt = holding ? now : null;

  const take = (state, isElsewhere) => {
    setElapsed(state.elapsed);
    setStartedAt(state.startedAt);
    setTimedSubjectId(state.timedSubjectId);
    setNow(Date.now());
    setElsewhere(isElsewhere);
  };
  const adopt = (saved) => take(savedTimer(saved, Date.now()), false);
  const yieldTimer = () => take(IDLE, true);

  useEffect(() => {
    if (elsewhere) {
      written.current = null;
    } else if (startedAt === null && elapsed === 0 && timedSubjectId === null) {
      written.current = null;
      removeKey(STORAGE_KEYS.timer);
    } else {
      written.current = { elapsed, startedAt, timedSubjectId, lastSeenAt, owner: tabId, heldAt };
      saveJson(STORAGE_KEYS.timer, written.current);
    }
  }, [elapsed, startedAt, timedSubjectId, lastSeenAt, heldAt, elsewhere, tabId]);

  // The latest handlers for the listeners below, which subscribe once.
  const handlers = useRef({});
  useEffect(() => {
    handlers.current = {
      // Ticks the display while running, beats the heartbeat while paused,
      // and while the session is elsewhere checks whether its owner has gone.
      tick: () => {
        const at = Date.now();
        if (!elsewhere) return setNow(at);
        const saved = loadJson(STORAGE_KEYS.timer, null);
        if (!ownedElsewhere(saved, tabId, at, RELEASE_GRACE_MS)) adopt(saved);
      },
      // Another tab's write: one that now owns a session takes it from this
      // tab (it was continued there); the timer being cleared frees this tab.
      change: (saved) => {
        if (saved === undefined) {
          if (elsewhere) adopt(null);
        } else if (typeof saved?.owner === "string" && saved.owner !== tabId && hasTime(saved)) {
          if (!elsewhere) yieldTimer();
        }
      },
      // Closing or reloading releases the timer; coming back from the
      // back/forward cache takes it again unless another tab has since.
      release: () => {
        if (written.current) saveJson(STORAGE_KEYS.timer, { ...written.current, owner: null });
      },
      reclaim: (event) => {
        if (!event.persisted || !written.current) return;
        if (ownedElsewhere(loadJson(STORAGE_KEYS.timer, null), tabId, Date.now())) yieldTimer();
        else saveJson(STORAGE_KEYS.timer, written.current);
      },
    };
  });

  const tickMs = running ? 500 : elsewhere ? POLL_MS : holding ? HEARTBEAT_MS : null;
  useEffect(() => {
    if (tickMs === null) return undefined;
    const interval = setInterval(() => handlers.current.tick(), tickMs);
    return () => clearInterval(interval);
  }, [tickMs]);

  useEffect(() => {
    const unsubscribe = subscribe((change) => {
      if (change.type === "external" && change.key === STORAGE_KEYS.timer) handlers.current.change(change.value);
    });
    const release = () => handlers.current.release();
    const reclaim = (event) => handlers.current.reclaim(event);
    window.addEventListener("pagehide", release);
    window.addEventListener("pageshow", reclaim);
    return () => {
      unsubscribe();
      release();
      window.removeEventListener("pagehide", release);
      window.removeEventListener("pageshow", reclaim);
    };
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    const refresh = () => setNow(Date.now());
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [running]);

  const displaySecs = running ? Math.max(0, Math.floor((now - startedAt) / 1000)) : elapsed;

  useEffect(() => {
    document.title = running ? `${fmt(displaySecs)} · StudyBox` : "StudyBox";
  }, [running, displaySecs]);

  const start = () => {
    if (!canTime || elsewhere) return;
    if (!timedSubjectId) setTimedSubjectId(defaultSubjectId);
    const startTime = Date.now();
    setNow(startTime);
    setStartedAt(startTime - elapsed * 1000);
  };

  const pause = () => {
    setElapsed(displaySecs);
    setStartedAt(null);
  };

  // Returns what it discarded, so Reset can be undone with restore().
  const reset = () => {
    setElapsed(0);
    setStartedAt(null);
    setTimedSubjectId(null);
    return { elapsed: displaySecs, running, timedSubjectId };
  };

  // Puts a reset timer back at the time it had. A timer that was running
  // carries on from there, so the gap before Undo isn't counted as study.
  // Never while another tab owns a session: that would make two writers.
  const restore = (state) => {
    if (elsewhere) return;
    const restartAt = Date.now();
    setElapsed(state.elapsed);
    setTimedSubjectId(state.timedSubjectId);
    setNow(restartAt);
    setStartedAt(state.running ? restartAt - state.elapsed * 1000 : null);
  };

  // Moves the session another tab owns to this one; that tab lets it go.
  const takeOver = () => adopt(loadJson(STORAGE_KEYS.timer, null));

  return { running, displaySecs, timedSubjectId, setTimedSubjectId, start, pause, reset, restore, elsewhere, takeOver };
}
