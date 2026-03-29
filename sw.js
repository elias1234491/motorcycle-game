var CACHE='moto-v1';
var FILES=['/motorcycle-game/','/motorcycle-game/index.html','/motorcycle-game/kawasaki.mp3','/motorcycle-game/kawasaki.glb','/motorcycle-game/bmw_ix.glb','/motorcycle-game/surron.glb'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES);}));
});

self.addEventListener('fetch',function(e){
  e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request);}));
});
