// The one place a reminder is shown. Chrome on Android throws "Illegal
// constructor" from `new Notification` even with permission granted, and only
// allows ServiceWorkerRegistration.showNotification, so try the constructor
// first (desktop behaviour is unchanged) and fall back to the registration.
// Never throws and never rejects: a reminder that can't be shown is dropped.
const READY_TIMEOUT_MS = 3000;

async function showViaServiceWorker(title, options) {
  const container = typeof navigator === "undefined" ? undefined : navigator.serviceWorker;
  if (!container || !container.ready) return false;
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(resolve, READY_TIMEOUT_MS, null);
  });
  try {
    // `ready` never resolves when no service worker is registered (dev, first
    // visit before activation), so don't wait for it forever.
    const registration = await Promise.race([container.ready, timeout]);
    if (!registration || typeof registration.showNotification !== "function") return false;
    await registration.showNotification(title, options);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Returns a promise of whether the reminder was shown.
export default function showReminder(title, options) {
  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return Promise.resolve(true);
  } catch {
    return showViaServiceWorker(title, options);
  }
}
