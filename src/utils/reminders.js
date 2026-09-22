import { dateKey, isStreakAtRisk } from "./gameLogic.js";
import { allMilestones, daysUntil } from "./milestones.js";

// A milestone is "due soon" from 3 days before its due date up to the day itself.
export const MILESTONE_REMINDER_DAYS = 3;

// The milestones today's reminder should mention: not done, dated, due
// between today and MILESTONE_REMINDER_DAYS days from now (overdue ones are
// already highlighted in the planner, so they don't re-notify). Empty when
// a milestone reminder already fired today (lastReminderDate is the local
// date it last fired, from sb-last-milestone-reminder).
export const milestonesToRemind = (subjects, { now = new Date(), lastReminderDate = null } = {}) => {
  if (lastReminderDate === dateKey(now)) return [];
  return allMilestones(subjects).filter((milestone) => {
    if (milestone.done) return false;
    const days = daysUntil(milestone.due, now);
    return days !== null && days >= 0 && days <= MILESTONE_REMINDER_DAYS;
  });
};

export const shouldShowMilestoneReminder = (subjects, options) =>
  milestonesToRemind(subjects, options).length > 0;

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
