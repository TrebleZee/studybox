export const DEFAULT_GAME = {
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null,
  streakProtectedUntil: null,
  totalXP: 0,
  freezesUsed: 0,
  // Calendar days a streak freeze covered. Needed so rebuilding the streak
  // from session history bridges those days instead of treating them as breaks.
  frozenDates: [],
};

export const DAY_MS = 24 * 60 * 60 * 1000;

export const dateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const normalizeDateKey = (value) => {
  if (value == null || value === "") return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return dateKey(value);
};

// A missed day is not considered a broken streak until 24 hours after
// 23:59:59 on the last day studied. This deliberately does not use a
// calendar-day comparison, so closing the app cannot reset a streak early.
export const streakExpiry = (lastStudyDate) => {
  const [year, month, day] = lastStudyDate.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime() + DAY_MS;
};

export const calendarDayDistance = (from, to) => {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  return (
    Date.UTC(toYear, toMonth - 1, toDay) -
    Date.UTC(fromYear, fromMonth - 1, fromDay)
  ) / DAY_MS;
};

const addDays = (key, days) => {
  const [year, month, day] = key.split("-").map(Number);
  return dateKey(new Date(year, month - 1, day + days));
};

// Two study days are part of the same run when every day between them was
// covered by a freeze. Frozen days bridge the gap but don't add to the count.
const isBridged = (previous, date, frozen) => {
  const distance = calendarDayDistance(previous, date);
  if (distance === 1) return true;
  for (let offset = 1; offset < distance; offset += 1) {
    if (!frozen.has(addDays(previous, offset))) return false;
  }
  return distance > 1;
};

const streakRuns = (dateStrings, frozenDates = []) => {
  const frozen = new Set(frozenDates);
  const runs = [];
  let streak = 0;
  let previous = null;

  dateStrings.forEach((date) => {
    if (previous === null || !isBridged(previous, date, frozen)) {
      streak = 1;
    } else {
      streak += 1;
    }
    runs.push(streak);
    previous = date;
  });

  return runs;
};

export const getStreakForDates = (dateStrings, frozenDates = []) => {
  const runs = streakRuns(dateStrings, frozenDates);
  return runs.length ? runs[runs.length - 1] : 0;
};

export const getLongestStreak = (dateStrings, frozenDates = []) =>
  streakRuns(dateStrings, frozenDates).reduce((longest, run) => Math.max(longest, run), 0);

// Saves from before frozenDates existed only know how many freezes were used,
// not when. Attribute them to the most recent gaps (including any trailing
// days already protected), walking back from the latest study day and
// stopping at the first gap the remaining freezes couldn't have covered.
export const inferFrozenDates = (dateStrings, freezesUsed, lastStudyDate, streakProtectedUntil) => {
  let budget = Number(freezesUsed) || 0;
  const frozen = [];

  if (lastStudyDate && streakProtectedUntil) {
    const trailing = Math.round((streakProtectedUntil - streakExpiry(lastStudyDate)) / DAY_MS);
    for (let offset = 1; offset <= trailing && budget > 0; offset += 1) {
      frozen.push(addDays(lastStudyDate, offset));
      budget -= 1;
    }
  }

  for (let i = dateStrings.length - 1; i > 0 && budget > 0; i -= 1) {
    const missed = calendarDayDistance(dateStrings[i - 1], dateStrings[i]) - 1;
    if (missed > budget) break;
    for (let offset = 1; offset <= missed; offset += 1) {
      frozen.push(addDays(dateStrings[i - 1], offset));
    }
    budget -= missed;
  }

  return frozen.sort();
};

export const normalizeGame = (loaded) => {
  if (!loaded || typeof loaded !== "object") return { ...DEFAULT_GAME };
  return {
    currentStreak: Number(loaded.currentStreak) || 0,
    longestStreak: Number(loaded.longestStreak) || 0,
    lastStudyDate: normalizeDateKey(loaded.lastStudyDate),
    streakProtectedUntil: Number(loaded.streakProtectedUntil) || null,
    totalXP: Number(loaded.totalXP) || 0,
    freezesUsed: Number(loaded.freezesUsed) || 0,
    // null marks a save from before frozenDates was tracked (see buildInitialGame).
    frozenDates: Array.isArray(loaded.frozenDates)
      ? loaded.frozenDates.map(normalizeDateKey).filter(Boolean)
      : null,
  };
};

export const validateStreak = (game, nowMs = Date.now()) => {
  if (!game.lastStudyDate || game.currentStreak <= 0) return game;

  let nextCheckAt = Math.max(
    streakExpiry(game.lastStudyDate),
    Number(game.streakProtectedUntil) || 0
  );
  if (nowMs < nextCheckAt) return game;

  let freezesUsed = game.freezesUsed;
  const frozenDates = [...(game.frozenDates || [])];
  let freezesAvailable = Math.min(
    Math.max(0, Math.floor(game.totalXP / 500) - freezesUsed),
    3
  );

  // Each available freeze protects one further 24-hour period. This loop
  // also makes launch validation correct after several days offline.
  while (nowMs >= nextCheckAt && freezesAvailable > 0) {
    freezesUsed += 1;
    freezesAvailable -= 1;
    // nextCheckAt is the end of the missed day; step back half a day so a
    // DST shift can't push the key onto the neighbouring date.
    frozenDates.push(dateKey(nextCheckAt - DAY_MS / 2));
    nextCheckAt += DAY_MS;
  }

  if (nowMs >= nextCheckAt) {
    return {
      ...game,
      currentStreak: 0,
      streakProtectedUntil: null,
      freezesUsed,
      frozenDates,
    };
  }

  return {
    ...game,
    freezesUsed,
    frozenDates,
    streakProtectedUntil: nextCheckAt,
  };
};

// True when the user has a streak that would break if they don't study today.
// Reuses validateStreak so a streak already covered by a freeze, or already
// lapsed, is never reported as "at risk".
export const isStreakAtRisk = (game, nowMs = Date.now()) => {
  const validated = validateStreak(game, nowMs);
  return validated.currentStreak > 0 && validated.lastStudyDate !== dateKey(nowMs);
};

export const buildInitialGame = (loaded, sessions, subjects, nowMs = Date.now()) => {
  const storedGame = normalizeGame(loaded);
  const dateStrings = Array.from(
    new Set(
      sessions
        .map((session) => dateKey(session.date))
        .filter(Boolean)
    )
  ).sort();
  const lastStudyDate = dateStrings[dateStrings.length - 1] || storedGame.lastStudyDate;
  const minutesStudied = sessions.reduce(
    (sum, session) => sum + Math.floor(session.duration / 60),
    0
  );
  const topicXP = subjects.reduce(
    (sum, subject) => sum + subject.topics.filter((topic) => topic.done).length * 10,
    0
  );
  const frozenDates = storedGame.frozenDates ?? inferFrozenDates(
    dateStrings,
    storedGame.freezesUsed,
    lastStudyDate,
    lastStudyDate === storedGame.lastStudyDate ? storedGame.streakProtectedUntil : null
  );
  const historicalStreak = dateStrings.length
    ? getStreakForDates(dateStrings, frozenDates)
    : storedGame.currentStreak;
  const historicalLongest = dateStrings.length
    ? getLongestStreak(dateStrings, frozenDates)
    : storedGame.longestStreak;
  const calculatedTotalXP = minutesStudied + topicXP;

  return validateStreak(
    {
      ...storedGame,
      currentStreak: historicalStreak,
      longestStreak: Math.max(storedGame.longestStreak, historicalLongest),
      lastStudyDate,
      // XP is earned progress, so keep persisted XP even if a session was
      // later deleted from the history.
      totalXP: Math.max(storedGame.totalXP, calculatedTotalXP),
      streakProtectedUntil: storedGame.streakProtectedUntil,
      frozenDates,
    },
    nowMs
  );
};

export const FREEZE_XP = 500;
export const MAX_FREEZES = 3;

export const freezeStats = (game) => {
  const earned = Math.floor(game.totalXP / FREEZE_XP);
  return {
    available: Math.min(Math.max(0, earned - game.freezesUsed), MAX_FREEZES),
    xpToNext: FREEZE_XP - (game.totalXP % FREEZE_XP),
  };
};

export const applyLoggedSession = (game, durationSecs, loggedAt = new Date()) => {
  const today = dateKey(loggedAt);
  const validated = validateStreak(game, loggedAt.getTime());
  let streak = validated.currentStreak;

  if (validated.lastStudyDate === today) {
    // already studied today: XP only, streak untouched
  } else if (validated.lastStudyDate && streak > 0) {
    streak += 1;
  } else {
    streak = 1;
  }

  return {
    ...validated,
    currentStreak: streak,
    longestStreak: Math.max(validated.longestStreak, streak),
    lastStudyDate: today,
    streakProtectedUntil: null,
    totalXP: validated.totalXP + Math.max(1, Math.floor(durationSecs / 60)),
  };
};
