const CACHE='tt02-assistant-v2-cache-5';
const FILES=['./','./index.html','./model3d.js','./vendor/three-bundle.min.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tt02-assistant-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
function putCache(req,res){if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);if(u.origin!==location.origin)return;
  const isPage=e.request.mode==='navigate'||u.pathname.endsWith('.html')||u.pathname.endsWith('/');
  if(isPage){
    // 頁面優先使用網路，確保拿到最新版；離線時改用快取。
    e.respondWith(fetch(e.request).then(res=>putCache(e.request,res)).catch(()=>caches.match(e.request).then(c=>c||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>putCache(e.request,res)).catch(()=>caches.match('./index.html'))));
});
