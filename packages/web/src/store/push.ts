import { api } from "../api/client.ts";

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  return Notification.requestPermission();
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getDeviceId(): string | null {
  try {
    return localStorage.getItem("bussy:device-id");
  } catch {
    return null;
  }
}

async function swReadyWithTimeout(timeoutMs = 10000): Promise<ServiceWorkerRegistration> {
  const ready = navigator.serviceWorker.ready;
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Service worker not ready within timeout")), timeoutMs),
  );
  return Promise.race([ready, timer]);
}

export async function subscribeToPush(): Promise<{ success: boolean; error?: string }> {
  const deviceID = getDeviceId();
  if (!deviceID) {
    return { success: false, error: "No device registered yet" };
  }
  if (!isPushSupported()) {
    return { success: false, error: "Push notifications not supported" };
  }
  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    return { success: false, error: "Notification permission denied" };
  }
  try {
    const registration = await swReadyWithTimeout();
    const { publicKey } = await api.getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });
    const subscriptionJson = subscription.toJSON();
    await api.registerPushSubscription(deviceID, {
      endpoint: subscriptionJson.endpoint!,
      keys: {
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Push subscription failed:", error);
    return { success: false, error: String(error) };
  }
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  const deviceID = getDeviceId();
  if (!deviceID) {
    return { success: false, error: "No device registered yet" };
  }
  try {
    const registration = await swReadyWithTimeout();
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    await api.unregisterPushSubscription(deviceID);
    return { success: true };
  } catch (error) {
    console.error("Push unsubscription failed:", error);
    return { success: false, error: String(error) };
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await swReadyWithTimeout();
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}
