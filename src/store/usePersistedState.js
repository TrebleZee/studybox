import { useEffect, useState } from "react";
import { saveJson } from "./localStore.js";

// useState that writes itself back to the store whenever it changes (and once
// on mount, so a normalised or migrated value replaces what was loaded).
export default function usePersistedState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    saveJson(key, value);
  }, [key, value]);
  return [value, setValue];
}
