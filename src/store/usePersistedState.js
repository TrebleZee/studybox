import { useEffect, useRef, useState } from "react";
import { saveJson, subscribe } from "./localStore.js";

// Key order doesn't matter when asking "did the merge add anything?".
const canonical = (value) =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v
  );

// useState that writes itself back to the store whenever it changes (and once
// on mount, so a normalised or migrated value replaces what was loaded).
//
// `load` reads and normalizes the stored value. When another tab changes the
// key, it is loaded again and, if `merge(local, theirs)` is given, merged with
// this tab's value; otherwise theirs replaces it. Only a merge that adds
// something theirs lacks is written back, so tabs never echo each other's
// writes: an external change costs at most one write here.
export default function usePersistedState(key, load, merge) {
  const [value, setValue] = useState(load);
  const fromOutside = useRef(undefined);
  const latest = useRef({ load, merge });

  useEffect(() => {
    latest.current = { load, merge };
  });

  useEffect(() => {
    if (value === fromOutside.current) return;
    saveJson(key, value);
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
