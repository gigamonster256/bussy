/// <reference lib="webworker" />

// Service Worker for Bussy
// Handles push notifications and caching

declare const self: ServiceWorkerGlobalScope

// Version for cache management
const CACHE_VERSION = "v1"
const CACHE_NAME = `bussy-${CACHE_VERSION}`

// Install event - cache static assets
self.addEventListener("install", (_event) => {
  console.log("[SW] Installing service worker...")
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...")
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith("bussy-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  // Take control of all clients immediately
  self.clients.claim()
})

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("[SW] Push received:", event)

  if (!event.data) {
    console.log("[SW] Push event has no data")
    return
  }

  let payload
  try {
    payload = event.data.json()
  } catch (e) {
    console.error("[SW] Failed to parse push data:", e)
    payload = {
      title: "Bus Notification",
      body: event.data.text()
    }
  }

  const options: NotificationOptions & { actions?: Array<{ action: string; title: string }> } = {
    body: payload.body,
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    tag: payload.tag || "bus-notification",
    data: payload.data || {},
    requireInteraction: true, // Keep notification visible until user interacts
    actions: [
      { action: "view", title: "View" },
      { action: "dismiss", title: "Dismiss" }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  )
})

// Notification click event - handle user interaction
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action)

  event.notification.close()

  if (event.action === "dismiss") {
    return
  }

  // Open or focus the app
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus()
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow("/")
      }
    })
  )
})

// Push subscription change event - re-subscribe if needed
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[SW] Push subscription changed")

  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true
        // The applicationServerKey should be fetched from the server
        // This is a fallback - the main app should handle re-subscription
      })
      .then((subscription) => {
        console.log("[SW] Re-subscribed to push:", subscription.endpoint)
        // Post message to any open clients to update the subscription on the server
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "PUSH_SUBSCRIPTION_CHANGED",
              subscription: subscription.toJSON()
            })
          })
        })
      })
      .catch((err) => {
        console.error("[SW] Failed to re-subscribe:", err)
      })
  )
})

// Message event - handle messages from the main app
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data)

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

export {}
