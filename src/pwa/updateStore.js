// Bridges the service worker registration (set up in main.jsx) to React.
// main.jsx marks an update as ready; useAppUpdate decides when it's safe to
// apply it, so a reload never lands in the middle of a study session.

export const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;

let ready = false;
let apply = null;
const listeners = new Set();

export const subscribeToUpdates = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const isUpdateReady = () => ready;

export const markUpdateReady = (applyFn) => {
  apply = applyFn;
  ready = true;
  listeners.forEach((listener) => listener());
};

export const applyUpdate = () => apply?.();

// Registers the service worker (main.jsx passes vite-plugin-pwa's registerSW)
// and feeds its update events into this store.
export const registerUpdates = (registerSW) => {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      markUpdateReady(() => updateSW(true));
    },
    onRegisteredSW(_swUrl, registration) {
      watchForUpdates(registration);
    },
  });
  return updateSW;
};

// Test-only: forget any pending update between tests.
export const resetUpdateStore = () => {
  ready = false;
  apply = null;
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
