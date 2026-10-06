/* Firebase Cloud Messaging service worker: shows HRMS notifications when no tab is open. */
importScripts("https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js");

// Config comes from the registration URL (?config=...), set from VITE_FIREBASE_* env vars.
firebase.initializeApp(JSON.parse(new URL(self.location.href).searchParams.get("config") || "{}"));

// Messages carry a `notification` block, so FCM displays them itself; this
// instance only needs to exist. Clicks open (or focus) the app's notifications page.
firebase.messaging();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        open.focus();
        return open.postMessage({ type: "open-notifications" });
      }
      return clients.openWindow("/");
    })
  );
});
