import { dateKey, isStreakAtRisk } from "./gameLogic.js";

// Fixed local hour after which an at-risk streak is worth nagging about.
export const REMINDER_HOUR = 20;

// Pure decision of whether tonight's streak reminder should fire, given the
// last date (if any) a reminder was already shown. Kept separate from the
// Notification API itself so the condition is trivial to unit test.
export const shouldShowStreakReminder = (game, { now = new Date(), lastReminderDate = null } = {}) => {
  if (now.getHours() < REMINDER_HOUR) return false;
  if (lastReminderDate === dateKey(now)) return false;
  return isStreakAtRisk(game, now.getTime());
};
