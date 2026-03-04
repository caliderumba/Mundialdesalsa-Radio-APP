self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || 'https://caliradiosalsa.com/wp-content/uploads/2025/07/caratula-respaldo.webp',
      badge: data.badge || 'https://caliradiosalsa.com/wp-content/uploads/2025/07/caratula-respaldo.webp',
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
