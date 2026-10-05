import { useState } from "react";
import { describeDeletion, restoreDeletion } from "../utils/undo.js";

// The last delete, until it is undone, dismissed, replaced by the next delete
// or cleared (the app clears it when the view changes). Call noteDeletion
// before deleting; `extra` rides along to onRestore (e.g. whether a deleted
// subject was selected). Undo puts the record back exactly as it was and
// removes its tombstone; XP follows by itself because it is derived.
// A timer Reset takes the same slot (noteTimerReset): its undo restores no
// records, only what onRestore puts back, and it is withdrawn as soon as a
// new session is in progress (timerBusy), so it can never overwrite one.
export default function useUndoDelete({ subjects, sessions, tombstones, setSubjects, setSessions, setTombstones, onRestore, timerBusy }) {
  const [undo, setUndo] = useState(null);
  if (undo?.kind === "timer" && timerBusy) setUndo(null);

  const noteDeletion = (kind, id, subjectId = null, extra = {}) => {
    const entry = describeDeletion({ subjects, sessions, tombstones }, kind, id, subjectId);
    setUndo(entry && { ...entry, ...extra });
  };

  const noteTimerReset = (timer, extra = {}) => {
    if (timer.elapsed > 0) setUndo({ kind: "timer", message: "Reset timer.", timer, ...extra });
  };

  const undoDelete = () => {
    if (!undo) return;
    if (undo.kind !== "timer") {
      const restored = restoreDeletion({ subjects, sessions, tombstones }, undo);
      setSubjects(restored.subjects);
      setSessions(restored.sessions);
      setTombstones(restored.tombstones);
    }
    onRestore?.(undo);
    setUndo(null);
  };

  return { undo, noteDeletion, noteTimerReset, undoDelete, clearUndo: () => setUndo(null) };
}
