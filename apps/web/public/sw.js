/* Offline support for app.capitolreceipts.com and the iPhone app.
- Pages: network first; with no connection, the last copy of the app opens.
- App files (/app/... with a version in the URL), photos and fonts: from the cache once fetched.
- Public data (/api/db, Supabase public tables): network first, last copy when offline.
Signed-in data (prefs, plan, devices, account calls) is never cached. */
const C='cr-v3';
const SHELL=['/'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const PRIVATE=/\/rest\/v1\/(user_prefs|subscriptions|push_devices|alert_log|signups|reports|corrections|rpc\/)|\/functions\/v1\/|\/auth\/v1\//;
async function netFirst(req,fallback){
  const c=await caches.open(C);
  try{const r=await fetch(req);if(r&&r.ok&&r.type!=='opaque')c.put(req,r.clone()).catch(()=>{});return r}
  catch(e){const hit=await c.match(req)||(fallback&&await c.match(fallback));if(hit)return hit;throw e}
}
async function cacheFirst(req){
  const c=await caches.open(C);const hit=await c.match(req);if(hit)return hit;
  const r=await fetch(req);if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone()).catch(()=>{});return r;
}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(PRIVATE.test(u.pathname)||req.headers.get('authorization')&&!/sb_publishable_/.test(req.headers.get('authorization')||''))return;
  if(u.origin===location.origin){
    if(req.mode==='navigate'){e.respondWith(netFirst(req,'/'));return}
    if(u.pathname.startsWith('/app/')||u.pathname.startsWith('/face/')){e.respondWith(cacheFirst(req));return}
    if(u.pathname.startsWith('/api/db')){e.respondWith(netFirst(req));return}
    return;
  }
  if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)||/cdn\.jsdelivr\.net$/.test(u.hostname)){e.respondWith(cacheFirst(req));return}
  if(/\.supabase\.co$/.test(u.hostname)&&u.pathname.startsWith('/rest/v1/')){e.respondWith(netFirst(req));return}
});
