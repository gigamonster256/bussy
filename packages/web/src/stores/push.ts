/**
 * Push notification helpers for the frontend
 */
import { api } from "../api/client.ts"

// Check if push is supported
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window
}

// Check if notifications are supported
export function isNotificationSupported(): boolean {
  return "Notification" in window
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied"
  return Notification.permission
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied"
  return Notification.requestPermission()
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers not supported")
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    })
    console.log("Service worker registered:", registration.scope)
    return registration
  } catch (error) {
    console.error("Service worker registration failed:", error)
    return null
  }
}

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Subscribe to push notifications
export async function subscribeToPush(
  deviceID: string
): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: "Push notifications not supported" }
  }

  // Check permission
  const permission = await requestNotificationPermission()
  if (permission !== "granted") {
    return { success: false, error: "Notification permission denied" }
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Get VAPID key from server
    const { publicKey } = await api.getVapidPublicKey()
    const applicationServerKey = urlBase64ToUint8Array(publicKey)

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource
    })

    // Send subscription to server
    const subscriptionJson = subscription.toJSON()
    await api.registerPushSubscription(deviceID, {
      endpoint: subscriptionJson.endpoint!,
      keys: {
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth
      }
    })

    console.log("Push subscription registered")
    return { success: true }
  } catch (error) {
    console.error("Push subscription failed:", error)
    return { success: false, error: String(error) }
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(
  deviceID: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
    }

    // Tell server to remove subscription
    await api.unregisterPushSubscription(deviceID)

    console.log("Push subscription removed")
    return { success: true }
  } catch (error) {
    console.error("Push unsubscription failed:", error)
    return { success: false, error: String(error) }
  }
}

// Check if currently subscribed to push
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch {
    return false
  }
}
