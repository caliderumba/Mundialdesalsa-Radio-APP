importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCs4qj1eCjnTOzqOALWK2BnnA5z4dsT9cw",
  authDomain: "mundial-de-salsa-f008c.firebaseapp.com",
  projectId: "mundial-de-salsa-f008c",
  storageBucket: "mundial-de-salsa-f008c.firebasestorage.app",
  messagingSenderId: "793052992987",
  appId: "1:793052992987:web:be19e1f21e084a102e43fe"
});

const messaging = firebase.messaging();

// Manejo de notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/Mundialdesalsa-Radio-APP/pwa-192x192.png',
    badge: '/Mundialdesalsa-Radio-APP/pwa-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
