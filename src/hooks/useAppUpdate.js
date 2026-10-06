import { useEffect, useSyncExternalStore } from "react";
import { applyUpdate, subscribeToUpdates, updateState } from "../pwa/updateStore.js";

const RETRY_MS = 30 * 1000;

const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

const isTextField = (el) =>
  el.tagName === "TEXTAREA" ||
  (el.tagName === "INPUT" && !NON_TEXT_INPUTS.has((el.getAttribute("type") || "text").toLowerCase()));

// True while the user is typing, or a text field holds text a reload would
// lose. Fields marked `data-autosaved` (the session note) survive a reload.
const hasUnsavedInput = () => {
  const active = document.activeElement;
  if (active && (active.isContentEditable || isTextField(active))) return true;
  return [...document.querySelectorAll("input, textarea")].some(
    (el) => isTextField(el) && !el.hasAttribute("data-autosaved") && el.value !== ""
  );
};

// Applies a downloaded update (which reloads the page) as soon as it's safe:
// nothing busy (a study session timed here, an undo on offer), the app idle on
// the planner (not settings or onboarding, whose forms aren't saved), no
// dialog open and no unsaved text. The same rule decides when a tab reloads
// after another tab applied the update (N18). Until then the caller shows a
// banner so the user can update by choice.
export default function useAppUpdate({ busy, idle }) {
  const state = useSyncExternalStore(subscribeToUpdates, updateState);

  useEffect(() => {
    if (state === "none" || busy || !idle) return undefined;
    const tryApply = () => {
      if (!document.querySelector('[role="dialog"]') && !hasUnsavedInput()) applyUpdate();
    };
    tryApply();
    const retry = setInterval(tryApply, RETRY_MS);
    return () => clearInterval(retry);
  }, [state, busy, idle]);

  return { updateReady: state !== "none", applyNow: applyUpdate };
}
