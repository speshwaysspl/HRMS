// Web push via Firebase Cloud Messaging (same project as the mobile app).
// The server already sends to every token in user.fcmTokens; this registers the
// browser's token so notifications arrive even when no HRMS tab is open.
// While a tab is open, the socket popup in NotificationContext shows them instead.
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, deleteToken, isSupported } from "firebase/messaging";
import { API_BASE } from "./apiConfig";

const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
// Firebase console → Project settings → Cloud Messaging → Web Push certificates.
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const TOKEN_KEY = "webPushToken";

const authHeader = () => ({
  Authorization: `Bearer ${sessionStorage.getItem("token") || localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

const messagingOrNull = async () => {
  if (!VAPID_KEY || !firebaseConfig.apiKey) {
    console.warn("Web push disabled: VITE_FIREBASE_* env vars are not set");
    return null;
  }
  if (!("serviceWorker" in navigator) || !(await isSupported().catch(() => false))) return null;
  const app = getApps()[0] || initializeApp(firebaseConfig);
  return getMessaging(app);
};

/** Ask permission (if not decided yet), get this browser's token and save it for the user. */
export const registerWebPush = async () => {
  try {
    const messaging = await messagingOrNull();
    if (!messaging) return;
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.register(
      // The worker is a static file, so it gets the config through its URL.
      `/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(firebaseConfig))}`
    );
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return;
    await fetch(`${API_BASE}/api/notifications/fcm-token`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ token }),
    });
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.warn("Web push registration failed:", err);
  }
};

/** On logout: stop pushes to this browser for this user. Call before the auth token is cleared. */
export const unregisterWebPush = async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  localStorage.removeItem(TOKEN_KEY);
  try {
    await fetch(`${API_BASE}/api/notifications/fcm-token`, {
      method: "DELETE",
      headers: authHeader(),
      body: JSON.stringify({ token }),
    });
    const messaging = await messagingOrNull();
    if (messaging) await deleteToken(messaging);
  } catch {
    // Best effort; the server drops dead tokens when sends fail.
  }
};
