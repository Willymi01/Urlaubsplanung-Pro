const CACHE='urlaubsplaner-v2.6';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))),self.registration.unregister(),self.clients.claim()])));
self.addEventListener('fetch',event=>event.respondWith(fetch(event.request)));
