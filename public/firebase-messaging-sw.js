importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "TU_API_KEY",
  projectId: "tu-proyecto",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
});

const messaging = firebase.messaging();

// Esto maneja la notificación cuando la App está en segundo plano
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/Mundialdesalsa-Radio-APP/pwa-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
