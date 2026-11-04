/* ECalendar v3.3 - FCM web push service worker. No cached private data. */
// The existing Firebase web config uses window.FIREBASE_CONFIG; adapt it for a worker.
self.window = self;
importScripts('./firebase-config.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');
if (self.FIREBASE_CONFIG && self.FIREBASE_CONFIG.apiKey &&
    !String(self.FIREBASE_CONFIG.apiKey).includes('PASTE_')) {
  firebase.initializeApp(self.FIREBASE_CONFIG);
  firebase.messaging();
}
// Notification payloads are displayed automatically by FCM in the background.
