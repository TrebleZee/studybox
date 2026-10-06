import { useEffect, useRef } from "react";
import { dateKey } from "../utils/gameLogic.js";
import { milestonesToRemind } from "../utils/reminders.js";
import showReminder from "../utils/showReminder.js";
import { loadJson, removeKey, saveJson, STORAGE_KEYS } from "../store/index.js";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Mirrors useStreakReminder: client-side only, asks for Notification
// permission at most once per app session and only when a milestone is
// actually due soon, fires at most once per local day, and stays silent if
// permission is denied or Notification doesn't exist.
export default function useMilestoneReminder(subjects) {
  const subjectsRef = useRef(subjects);
  const askedThisSessionRef = useRef(false);

  useEffect(() => {
    subjectsRef.current = subjects;
  });

  useEffect(() => {
    if (typeof Notification === "undefined") return undefined;

    const run = () => {
      const now = new Date();
      const lastReminderDate = loadJson(STORAGE_KEYS.lastMilestoneReminder, null);
      const due = milestonesToRemind(subjectsRef.current, { now, lastReminderDate });
      if (!due.length) return;

      if (Notification.permission === "default") {
        if (!askedThisSessionRef.current) {
          askedThisSessionRef.current = true;
          Promise.resolve(Notification.requestPermission()).catch(() => {});
        }
        return;
      }
      if (Notification.permission !== "granted") return;

      // Marked first so a second check can't double up while it is shown; a
      // reminder that couldn't be shown gives the day back.
      saveJson(STORAGE_KEYS.lastMilestoneReminder, dateKey(now));
      const [first] = due;
      const shown = showReminder(due.length === 1 ? `${first.name} is due soon` : `${due.length} milestones are due soon`, {
        body: due.map((milestone) => `${milestone.subjectName}: ${milestone.name} (${milestone.due})`).join("\n"),
        tag: "studybox-milestone-reminder",
      });
      shown.then((ok) => {
        if (!ok) {
          if (lastReminderDate == null) removeKey(STORAGE_KEYS.lastMilestoneReminder);
          else saveJson(STORAGE_KEYS.lastMilestoneReminder, lastReminderDate);
        }
      });
    };

    // A reminder is never worth losing the app over: nothing may throw out of
    // the effect, the interval or the visibility handler.
    const check = () => {
      try {
        run();
      } catch {
        // Notifications unavailable or refused; try again at the next check.
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
}
