// Firebase Messaging Service Worker
// This runs in the background to receive push notifications when the app is closed

importScripts(
  "https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js"
);

// Firebase config is injected at runtime — must match your app's config
firebase.initializeApp({
  apiKey: "***REMOVED***",
  authDomain: "local-resource-share.firebaseapp.com",
  projectId: "local-resource-share",
  storageBucket: "local-resource-share.firebasestorage.app",
  messagingSenderId: "124786154163",
  appId: "1:124786154163:web:d0968ecccf85733ae96ec6",
});

const messaging = firebase.messaging();

// Handle background messages (when app is not in focus)
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};

  self.registration.showNotification(title || "GearShare", {
    body: body || "You have a new notification",
    icon: icon || "/vite.svg",
    badge: "/vite.svg",
    data: payload.data,
    actions: [{ action: "open", title: "Open App" }],
  });
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Open the app when notification is clicked
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        return clients.openWindow("/requests");
      })
  );
});
