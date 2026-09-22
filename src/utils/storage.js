export const STORAGE_KEYS = {
  subjects: "sb-subjects",
  sessions: "sb-sessions",
  theme: "sb-theme",
  asana: "sb-asana",
  asanaStats: "sb-asana-stats",
  game: "sb-game",
  onboarded: "sb-onboarded",
  lastStreakReminder: "sb-last-streak-reminder",
};

export const loadJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};
