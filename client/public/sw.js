// 매출 보고 앱 Service Worker
const CACHE_NAME = 'sales-report-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 푸시 알림 수신 처리
self.addEventListener('push', (event) => {
  let data = { title: '매출 보고', body: '새로운 매출 보고가 도착했습니다.' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663544956173/iJ7WC357SjYWxzEAX5nDtr/icon-192_34ad05fa.png',
    badge: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663544956173/iJ7WC357SjYWxzEAX5nDtr/icon-192_34ad05fa.png',
    vibrate: [200, 100, 200],
    data: { url: '/' },
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
