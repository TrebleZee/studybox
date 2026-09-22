import { useEffect, useRef } from "react";
import { dateKey, isStreakAtRisk } from "../utils/gameLogic.js";
import { shouldShowStreakReminder } from "../utils/reminders.js";
import { loadJson, STORAGE_KEYS } from "../utils/storage.js";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Client-side only: no push server, so this only ever fires while the app
// (foreground tab, backgrounded tab, or installed PWA) is actually open.
export default function useStreakReminder(game) {
  const gameRef = useRef(game);
  const askedThisSessionRef = useRef(false);

  useEffect(() => {
    gameRef.current = game;
  });

  useEffect(() => {
    if (typeof Notification === "undefined") return undefined;

    const check = () => {
      const currentGame = gameRef.current;
      const now = new Date();

      if (Notification.permission === "default") {
        // Only prompt on a day this could actually matter, and at most once
        // per app session, so a "not now" dismissal isn't re-nagged.
        if (!askedThisSessionRef.current && isStreakAtRisk(currentGame, now.getTime())) {
          askedThisSessionRef.current = true;
          Notification.requestPermission().catch(() => {});
        }
        return;
      }

      if (Notification.permission !== "granted") return;

      const lastReminderDate = loadJson(STORAGE_KEYS.lastStreakReminder, null);
      if (!shouldShowStreakReminder(currentGame, { now, lastReminderDate })) return;

      localStorage.setItem(STORAGE_KEYS.lastStreakReminder, JSON.stringify(dateKey(now)));
      const notification = new Notification("Your streak is waiting", {
        body: `You're on a ${currentGame.currentStreak}-day streak. Log a session today to keep it going.`,
        tag: "studybox-streak-reminder",
      });
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
