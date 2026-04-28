// Service Worker для PWA
const CACHE_NAME = 'card-rpg-v1'
const ASSETS = [
  '/',
  '/index.html',
  '/assets/data/config.json',
  '/assets/fonts/Monomakh-Regular.ttf'
]

// Установка кэша
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS)
    })
  )
  self.skipWaiting()
})

// Активация
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Запросы
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})
