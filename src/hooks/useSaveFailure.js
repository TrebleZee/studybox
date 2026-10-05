import { useSyncExternalStore } from "react";
import { storageProblem, subscribe } from "../store/index.js";

// What, if anything, is stopping the app saving: "blocked" (the browser
// denies storage), "full" (a write failed; clears on that key's next
// successful write), "unreadable" (stored data didn't parse and was left as
// it was; clears once that data is next saved) or null.
export default function useSaveFailure() {
  return useSyncExternalStore(subscribe, storageProblem);
}
