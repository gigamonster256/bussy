import { Config, Effect, Redacted } from "effect"
import webPush from "web-push"
import type { Device } from "../device"

export interface PushPayload {
  readonly title: string
  readonly body: string
  readonly icon?: string
  readonly badge?: string
  readonly tag?: string
  readonly data?: Record<string, unknown>
}

interface SendResult {
  deviceID: string
  success: boolean
  reason?: "no-subscription" | "expired" | "error"
}

/**
 * Web Push notification service
 * Handles sending push notifications to subscribed devices
 */
export class WebPushService extends Effect.Service<WebPushService>()("WebPushService", {
  effect: Effect.gen(function*() {
    // Load VAPID keys from environment
    const vapidPublicKey = yield* Config.string("VAPID_PUBLIC_KEY")
    const vapidPrivateKeyRedacted = yield* Config.redacted("VAPID_PRIVATE_KEY")
    const vapidSubject = yield* Config.string("VAPID_SUBJECT").pipe(
      Config.withDefault("mailto:admin@example.com")
    )

    yield* Effect.logInfo("Initializing Web Push service")

    // Extract the private key value for web-push (required by the library)
    const vapidPrivateKey = Redacted.value(vapidPrivateKeyRedacted)

    // Configure web-push
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    return {
      /**
       * Get the VAPID public key (for client registration)
       */
      getPublicKey: Effect.succeed(vapidPublicKey),

      /**
       * Send a push notification to a device
       * Returns true if successful, false if the subscription is invalid/expired
       */
      sendNotification: (device: Device, payload: PushPayload) =>
        Effect.gen(function*() {
          if (!device.pushEndpoint || !device.pushP256dh || !device.pushAuth) {
            yield* Effect.logDebug(`Device ${device.id} has no push subscription`)
            return false
          }

          const subscription = {
            endpoint: device.pushEndpoint,
            keys: {
              p256dh: device.pushP256dh,
              auth: device.pushAuth
            }
          }

          const notificationPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.icon ?? "/icon-192.png",
            badge: payload.badge ?? "/badge-72.png",
            tag: payload.tag,
            data: payload.data
          })

          const result = yield* Effect.tryPromise({
            try: () => webPush.sendNotification(subscription, notificationPayload),
            catch: (error) => error
          }).pipe(
            Effect.map(() => true),
            Effect.catchAll((error) => {
              const webPushError = error as { statusCode?: number }
              if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
                // Subscription is expired
                return Effect.succeed(false)
              }
              return Effect.logError(`Push error for device ${device.id}: ${error}`).pipe(
                Effect.map(() => false)
              )
            })
          )

          return result
        }),

      /**
       * Send notification to multiple devices
       * Returns array of device IDs that failed (for cleanup)
       */
      sendToDevices: (devices: Array<Device>, payload: PushPayload) =>
        Effect.gen(function*() {
          const results: Array<SendResult> = yield* Effect.all(
            devices.map((device) =>
              Effect.gen(function*() {
                if (!device.pushEndpoint) {
                  return { deviceID: device.id, success: false, reason: "no-subscription" as const }
                }

                const subscription = {
                  endpoint: device.pushEndpoint,
                  keys: {
                    p256dh: device.pushP256dh!,
                    auth: device.pushAuth!
                  }
                }

                const notificationPayload = JSON.stringify({
                  title: payload.title,
                  body: payload.body,
                  icon: payload.icon ?? "/icon-192.png",
                  badge: payload.badge ?? "/badge-72.png",
                  tag: payload.tag,
                  data: payload.data
                })

                const sendResult: SendResult = yield* Effect.tryPromise({
                  try: () => webPush.sendNotification(subscription, notificationPayload),
                  catch: (error) => error
                }).pipe(
                  Effect.map((): SendResult => ({ deviceID: device.id, success: true })),
                  Effect.catchAll((error): Effect.Effect<SendResult> => {
                    const webPushError = error as { statusCode?: number }
                    if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
                      return Effect.succeed({
                        deviceID: device.id,
                        success: false,
                        reason: "expired" as const
                      })
                    }
                    return Effect.succeed({
                      deviceID: device.id,
                      success: false,
                      reason: "error" as const
                    })
                  })
                )

                return sendResult
              })
            ),
            { concurrency: 10 }
          )

          // Return IDs of devices with expired subscriptions (for cleanup)
          const expired = results
            .filter((r) => !r.success && r.reason === "expired")
            .map((r) => r.deviceID)

          const successCount = results.filter((r) => r.success).length
          yield* Effect.logInfo(
            `Push sent: ${successCount}/${devices.length} successful, ${expired.length} expired`
          )

          return { successCount, expiredDeviceIds: expired }
        })
    }
  }),
  dependencies: []
}) {}
