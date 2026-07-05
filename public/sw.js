const CACHE_NAME = 'campus-helpdesk-v3'

const STATIC_ASSETS = [
  '/visitor',
  '/login',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {})
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // Never cache Next.js chunks
  if (url.pathname.startsWith('/_next/static/chunks/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
    return
  }

  // Never cache API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'You are offline.' }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      )
    )
    return
  }

  // Cache static Next.js assets
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
      })
    )
    return
  }

  // Network first for all pages
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type !== 'opaque') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached
          if (request.mode === 'navigate') {
            return caches.match('/visitor')
          }
          return new Response('Offline', { status: 503 })
        })
      })
  )
})

// Push notification handler
self.addEventListener('push', function(event) {
  console.log('[SW] Push received:', event)

  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch(e) {
    data = { title: 'New Notification', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Smart Campus Help Desk'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: data.data || { link: '/dashboard' },
    vibrate: [100, 50, 100],
    tag: 'campus-notification',
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  const link = (event.notification.data && event.notification.data.link)
    ? event.notification.data.link
    : '/dashboard/notifications'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If app is already open — navigate to the link
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i]
        if ('focus' in client) {
          client.navigate(link)
          return client.focus()
        }
      }
      // App is closed — open a new window to the link
      if (clients.openWindow) {
        return clients.openWindow(link)
      }
    })
  )
})