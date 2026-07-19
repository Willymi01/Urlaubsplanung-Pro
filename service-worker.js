const CACHE='urlaubsplaner-v5.6.0-static';
const OFFLINE='./index.html';
const ASSETS=[
 './',
 './index.html',
 './app.js?v=5.6.0',
 './style.css?v=5.6.0',
 './data/default-data.js?v=5.6.0',
 './core/storage.js?v=5.6.0',
 './manifest.webmanifest',
 './icons/icon-192.png',
 './icons/icon-512.png'
];

self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
 self.skipWaiting();
});

self.addEventListener('activate',event=>{
 event.waitUntil(
  caches.keys()
   .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
   .then(()=>self.clients.claim())
 );
});

self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.hostname.endsWith('.supabase.co'))return;

 const isCode=url.origin===location.origin &&
  (url.pathname.endsWith('.html')||
   url.pathname.endsWith('.js')||
   url.pathname.endsWith('.css')||
   url.pathname.endsWith('.webmanifest')||
   url.pathname.endsWith('/'));

 if(isCode){
  event.respondWith(
   fetch(event.request,{cache:'no-store'})
    .then(response=>{
     const copy=response.clone();
     caches.open(CACHE).then(cache=>cache.put(event.request,copy));
     return response;
    })
    .catch(()=>caches.match(event.request).then(hit=>hit||caches.match(OFFLINE)))
  );
  return;
 }

 event.respondWith(
  caches.match(event.request)
   .then(hit=>hit||fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
   }))
 );
});
