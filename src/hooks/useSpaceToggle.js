import { useEffect } from "react";

// Space toggles the timer unless the user is typing, a dialog is open, or
// focus is inside something that handles Space itself (data-own-keys).
export default function useSpaceToggle(toggle) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code !== "Space") return;
      if (document.querySelector('[role="dialog"]')) return;
      if (e.target?.closest?.("[data-own-keys]")) return;

      const target = e.target;
      const tag = target?.tagName;
      if (target?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }

      e.preventDefault();
      toggle();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });
}
