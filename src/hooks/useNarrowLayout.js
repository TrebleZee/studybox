import { useSyncExternalStore } from "react";

// The one phone breakpoint. `NARROW_QUERY` must match the @media rules in
// `src/utils/appCss.js`.
export const NARROW_QUERY = "(max-width: 720px)";

const mediaList = () => {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(NARROW_QUERY)
      : null;
  } catch {
    return null;
  }
};

const subscribe = (onChange) => {
  const list = mediaList();
  if (!list) return () => {};
  if (list.addEventListener) {
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }
  list.addListener?.(onChange);
  return () => list.removeListener?.(onChange);
};

const getSnapshot = () => Boolean(mediaList()?.matches);

// True on a phone-width screen. False wherever matchMedia is missing (jsdom),
// so the desktop layout is the default and nothing here can throw.
export default function useNarrowLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
