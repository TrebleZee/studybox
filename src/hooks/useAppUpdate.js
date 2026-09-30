import { useEffect, useSyncExternalStore } from "react";
import { applyUpdate, isUpdateReady, subscribeToUpdates } from "../pwa/updateStore.js";

const RETRY_MS = 30 * 1000;

// Applies a downloaded update (which reloads the page) as soon as it's safe:
// no study session in progress and no dialog open. Until then the caller shows
// a banner so the user can update by choice.
export default function useAppUpdate({ sessionInProgress }) {
  const updateReady = useSyncExternalStore(subscribeToUpdates, isUpdateReady);

  useEffect(() => {
    if (!updateReady || sessionInProgress) return undefined;
    const tryApply = () => {
      if (!document.querySelector('[role="dialog"]')) applyUpdate();
    };
    tryApply();
    const retry = setInterval(tryApply, RETRY_MS);
    return () => clearInterval(retry);
  }, [updateReady, sessionInProgress]);

  return { updateReady, applyNow: applyUpdate };
}
