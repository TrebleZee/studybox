import { useEffect, useRef } from "react";
import { dateKey } from "../utils/gameLogic.js";
import { milestonesToRemind } from "../utils/reminders.js";
import { loadJson, STORAGE_KEYS } from "../utils/storage.js";

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

    const check = () => {
      const now = new Date();
      const lastReminderDate = loadJson(STORAGE_KEYS.lastMilestoneReminder, null);
      const due = milestonesToRemind(subjectsRef.current, { now, lastReminderDate });
      if (!due.length) return;

      if (Notification.permission === "default") {
        if (!askedThisSessionRef.current) {
          askedThisSessionRef.current = true;
          Notification.requestPermission().catch(() => {});
        }
        return;
      }
      if (Notification.permission !== "granted") return;

      localStorage.setItem(STORAGE_KEYS.lastMilestoneReminder, JSON.stringify(dateKey(now)));
      const [first] = due;
      const notification = new Notification(
        due.length === 1 ? `${first.name} is due soon` : `${due.length} milestones are due soon`,
        {
          body: due.map((milestone) => `${milestone.subjectName}: ${milestone.name} (${milestone.due})`).join("\n"),
          tag: "studybox-milestone-reminder",
        }
      );
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
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
