// Bridges the service worker registration (set up in main.jsx) to React.
// main.jsx marks an update as ready; useAppUpdate decides when it's safe to
// apply it, so a reload never lands in the middle of a study session.
//
// Applying an update in any tab hands every open tab to the new version at
// once. The register client would reload each of them (N18); instead a tab
// only reloads straight away if it asked for the update itself, and any other
// tab is left to useAppUpdate, which reloads it once it's safe and shows the
// banner until then.

export const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;

const defaultReload = () => window.location.reload();

// "none", "ready" (downloaded, waiting) or "active" (another tab applied it:
// the new version already controls this page, so updating is just a reload).
let state = "none";
let apply = null;
let requested = false;
let reload = defaultReload;
const listeners = new Set();

const setState = (next) => {
  state = next;
  listeners.forEach((listener) => listener());
};

export const subscribeToUpdates = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const updateState = () => state;

export const isUpdateReady = () => state !== "none";

export const markUpdateReady = (applyFn) => {
  apply = applyFn;
  if (state === "none") setState("ready");
};

// The new version has taken control of this page.
export const markUpdateActive = () => {
  if (requested) return reload();
  if (state !== "active") setState("active");
  return undefined;
};

export const applyUpdate = () => {
  if (state === "active") return reload();
  requested = true;
  return apply?.();
};

// Registers the service worker (main.jsx passes vite-plugin-pwa's registerSW)
// and feeds its update events into this store.
export const registerUpdates = (registerSW, { reload: reloadPage = defaultReload } = {}) => {
  reload = reloadPage;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      markUpdateReady(() => updateSW(true));
    },
    // Without this the register client reloads every tab on `controlling`.
    onNeedReload: markUpdateActive,
    onRegisteredSW(_swUrl, registration) {
      watchForUpdates(registration);
    },
  });
  return updateSW;
};

// Test-only: forget any pending update between tests.
export const resetUpdateStore = () => {
  state = "none";
  apply = null;
  requested = false;
  reload = defaultReload;
  listeners.clear();
};

// An open app only checks for a new service worker on navigation, so poll it
// on an interval and whenever the app comes back to the foreground.
export const watchForUpdates = (registration, intervalMs = UPDATE_CHECK_INTERVAL_MS) => {
  if (!registration) return () => {};
  const check = () => {
    if (navigator.onLine === false) return;
    registration.update().catch(() => {});
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") check();
  };
  const interval = setInterval(check, intervalMs);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
  };
};
