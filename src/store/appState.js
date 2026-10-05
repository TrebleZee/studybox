import { normalizeAsanaConfig } from "../services/asanaClient.js";
import { buildInitialGame, normalizeGame } from "../utils/gameLogic.js";
import { mergeGameStates, mergeSessionLists, mergeSubjectLists } from "../utils/merge.js";
import { normalizeSessions, normalizeSubjects } from "../utils/subjects.js";
import { mergeTombstones, normalizeTombstones } from "../utils/tombstones.js";
import { loadJson, STORAGE_KEYS } from "./localStore.js";

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
// tab's value. The running timer and the unlogged session draft are per-tab
// and never reconciled: a timer running in two tabs is two timers.
export const tabMerges = (localTombstones) => {
  const tombstones = () => mergeTombstones(localTombstones, loaders.tombstones());
  return {
    subjects: (local, theirs) => normalizeSubjects(mergeSubjectLists(local, theirs, tombstones())),
    sessions: (local, theirs) => normalizeSessions(mergeSessionLists(local, theirs, tombstones())),
    game: (local, theirs) =>
      normalizeGame(mergeGameStates(local, theirs, loaders.sessions(), loaders.subjects())),
  };
};
