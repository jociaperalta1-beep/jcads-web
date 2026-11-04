/* JC ADS app: guarda solo páginas propias para abrir rápido. Nunca guarda radios, anuncios ni la API. */
var C="jcads-app-v1";
var CORE=["/","/radio/","/herramientas/","/musica/","/style.css","/i18n.js","/pwa.js","/herramientas/tools.css","/herramientas/tools.js","/logo.png","/favicon.png","/icon-192.png"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(CORE)}).catch(function(){}));self.skipWaiting();});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}));});
self.addEventListener("fetch",function(e){
 var r=e.request,u=new URL(r.url);
 if(r.method!=="GET"||u.origin!==location.origin||/\.(mp3|mp4|m4a)$/i.test(u.pathname)||u.pathname.indexOf("/l/")===0) return;
 e.respondWith(fetch(r).then(function(res){
  if(res&&res.ok&&res.type==="basic"){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)});}
  return res;
 }).catch(function(){return caches.match(r).then(function(m){return m||caches.match("/")})}));
});
