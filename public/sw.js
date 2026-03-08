self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "Taapr";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: { url: data.url },
    tag: data.tag || "taapr-notification",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
