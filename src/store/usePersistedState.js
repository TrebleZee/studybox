import { useEffect, useRef, useState } from "react";
import { isUnreadable, loadText, removeKey, saveJson, subscribe } from "./localStore.js";
import { storedSchemaIsNewer } from "./migrations.js";

// Key order doesn't matter when asking "did the merge add anything?".
const canonical = (value) =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v
  );

// useState that writes itself back to the store whenever it changes (and once
// on mount, so a normalised or migrated value replaces what was loaded).
// Stored data that didn't parse is the exception: the mount write would
// replace it with a default, so it is skipped and the text stays in storage
// until the user changes that data (the app tells them first; see
// storageProblem in localStore.js). So is data a newer build wrote
// (storedSchemaIsNewer): a key this build has not changed is left exactly as
// stored, and is only written once the user changes it here.
//
// `placeholder(value)`, if given, says the value is a stand-in that isn't the
// user's data yet (the onboarding defaults, N10): it is never written, and a
// stored value is removed instead, so loading the key gives the stand-in back.
//
// `load` reads and normalizes the stored value. When another tab changes the
// key, it is loaded again and, if `merge(local, theirs)` is given, merged with
// this tab's value; otherwise theirs replaces it. Only a merge that adds
// something theirs lacks is written back, so tabs never echo each other's
// writes: an external change costs at most one write here.
export default function usePersistedState(key, load, merge, placeholder) {
  const [value, setValue] = useState(load);
  const loaded = useRef(value);
  const fromOutside = useRef(undefined);
  const latest = useRef({ load, merge, placeholder });

  useEffect(() => {
    latest.current = { load, merge, placeholder };
  });

  useEffect(() => {
    if (value === fromOutside.current) return;
    if (value === loaded.current && (isUnreadable(key) || storedSchemaIsNewer())) return;
    if (!latest.current.placeholder?.(value)) saveJson(key, value);
    else if (loadText(key)) removeKey(key);
  }, [key, value]);

  useEffect(
    () =>
      subscribe((change) => {
        if (change.key !== key || change.type !== "external") return;
        const theirs = latest.current.load();
        setValue((local) => {
          if (canonical(local) === canonical(theirs)) return local;
          const next = latest.current.merge ? latest.current.merge(local, theirs) : theirs;
          if (canonical(next) !== canonical(theirs)) return next;
          fromOutside.current = theirs;
          return theirs;
        });
      }),
    [key]
  );

  return [value, setValue];
}
