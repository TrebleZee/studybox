import { normalizeAsanaConfig } from "../services/asanaClient.js";
import { BACKUP_VERSION, buildBackup } from "../utils/backup.js";
import { buildInitialGame, normalizeGame } from "../utils/gameLogic.js";
import { mergeGameStates, mergeSessionLists, mergeSubjectLists } from "../utils/merge.js";
import { isUntouchedDefaultSubjects, normalizeSessions, normalizeSubjects } from "../utils/subjects.js";
import { mergeTombstones, normalizeTombstones } from "../utils/tombstones.js";
import { isUnreadable, loadJson, loadText, STORAGE_KEYS, unreadableText } from "./localStore.js";

const K = STORAGE_KEYS;

// How each persisted piece of app state is read back: load plus normalize.
// Used on launch and again whenever another tab changes the key.
export const loaders = {
  theme: () => loadJson(K.theme, "midnight"),
  subjects: () => normalizeSubjects(loadJson(K.subjects, null)),
  sessions: () => normalizeSessions(loadJson(K.sessions, [])),
  asana: () => normalizeAsanaConfig(loadJson(K.asana, null)),
  asanaStats: () => loadJson(K.asanaStats, null),
  game: () => buildInitialGame(loadJson(K.game, null), loaders.sessions(), loaders.subjects()),
  // Soft deletes: what was removed and when, so a merge can tell "deleted
  // here" from "never existed here".
  tombstones: () => normalizeTombstones(loadJson(K.tombstones, null)),
  onboarded: () => loadJson(K.onboarded, false),
};

// A backup built straight from storage, not from React state, for when
// rendering is what broke. The Asana token is never in it: both paths read
// only the account-scope study keys.
//
// If loading or normalizing the stored data throws (bad stored data can be
// exactly what crashed the app), the backup falls back to the raw parsed
// values, so the download still holds what is on disk.
//
// Account data whose stored text doesn't parse goes in as that text, under
// `unreadable` (key -> text), so nothing on disk is left out. Restoring the
// file ignores it; it is there to be repaired by hand.
const withUnreadable = (backup) => {
  const unreadable = unreadableText();
  return Object.keys(unreadable).length ? { ...backup, unreadable } : backup;
};

const rawOrBuiltBackup = () => {
  try {
    return buildBackup({
      subjects: loaders.subjects(),
      sessions: loaders.sessions(),
      themeId: loaders.theme(),
      game: loaders.game(),
      tombstones: loaders.tombstones(),
    });
  } catch {
    return {
      subjects: loadJson(K.subjects, null),
      sessions: loadJson(K.sessions, null),
      theme: loadJson(K.theme, null),
      game: loadJson(K.game, null),
      tombstones: loadJson(K.tombstones, null),
      version: BACKUP_VERSION,
    };
  }
};

export const storedBackup = () => withUnreadable(rawOrBuiltBackup());

// How a tab folds another tab's change into its own state (see
// usePersistedState). Records merge exactly as a backup merge does, against
// every tombstone either tab knows of, so a stale write from one tab can
// neither drop the other's new records nor bring back what it deleted.
// `localTombstones` are this tab's in-memory tombstones: the stored ones may
// just have been overwritten by the other tab. Results are normalized so
// they compare equal to what the other tab loads, which is what stops echoes.
//
// Tombstones merge with mergeTombstones (later deletion wins). Keys with no
// merge at all (theme, Asana settings, onboarded) take the other
// tab's value. The running timer and the unlogged session draft are never
// reconciled: one tab owns the timer and no other writes it (useTimer).
export const tabMerges = (localTombstones) => {
  const tombstones = () => mergeTombstones(localTombstones, loaders.tombstones());
  return {
    // The untouched placeholder defaults are nobody's data (N10): a tab still
    // holding them takes the other tab's subjects rather than adding them back.
    subjects: (local, theirs) =>
      isUntouchedDefaultSubjects(local) ? theirs : normalizeSubjects(mergeSubjectLists(local, theirs, tombstones())),
    sessions: (local, theirs) => normalizeSessions(mergeSessionLists(local, theirs, tombstones())),
    game: (local, theirs) =>
      normalizeGame(mergeGameStates(local, theirs, loaders.sessions(), loaders.subjects())),
  };
};

// This tab's account data as it stands now: `local` (state an async action
// captured before it awaited, so possibly a change behind) with what is stored
// folded in, the way usePersistedState folds in another tab's change. Merge
// and Restore from file build on this once the file is read, so a change
// another tab saved during the read is neither overwritten nor left out of
// the undo (R1 from #66's review). Theme and onboarded take the stored value,
// as tabs do (onboarded only once set).
export const latestAccountData = (local) => {
  const merge = tabMerges(local.tombstones);
  // A key that is missing or doesn't parse has nothing to add: its loader
  // would give defaults (the placeholder subjects), not another tab's data.
  const withStored = (key, load, mine, fold) => {
    if (!loadText(key)) return mine;
    const theirs = load();
    return isUnreadable(key) ? mine : fold(mine, theirs);
  };
  const subjects = withStored(K.subjects, loaders.subjects, local.subjects, merge.subjects);
  const sessions = withStored(K.sessions, loaders.sessions, local.sessions, merge.sessions);
  const onboarded = Boolean(local.onboarded || loaders.onboarded());
  return {
    subjects,
    sessions,
    tombstones: withStored(K.tombstones, loaders.tombstones, local.tombstones, mergeTombstones),
    game: withStored(K.game, loaders.game, local.game, merge.game),
    themeId: loadJson(K.theme, local.themeId),
    onboarded,
    // Still the untouched onboarding defaults, which nobody's data replaces (N10).
    placeholder: !onboarded && sessions.length === 0 && isUntouchedDefaultSubjects(subjects),
  };
};
