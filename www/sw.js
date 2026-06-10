"use strict";
/* سرویس‌ورکرِ ساکر استارز — کشِ آفلاین */
const CACHE = 'soccer-stars-v5';
const ASSETS = [
  './', './index.html', './styles.css',
  './config.js', './physics.js', './render.js', './audio.js', './main.js',
  './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'
];
// فایلِ موسیقی ممکن است وجود نداشته باشد؛ جداگانه و بدونِ خطا کش می‌شود
const OPTIONAL = ['./menu-music.mp3', './menu-music.ogg', './menu-music.m4a', './menu-music.wav'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ASSETS);
    await Promise.all(OPTIONAL.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if(cached) return cached;
    try{
      const res = await fetch(req);
      if(res && res.ok && new URL(req.url).origin === location.origin){
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
      return res;
    }catch(err){
      return cached || Response.error();
    }
  })());
});
