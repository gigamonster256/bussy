import { Effect, Layer } from "effect"
import type { Device } from "../../src/db/index.ts"
import type { PushPayload } from "../../src/services/WebPushService.ts"
import { WebPushService } from "../../src/services/WebPushService.ts"

// Fake VAPID public key for testing
const MOCK_VAPID_PUBLIC_KEY = "BMockVapidPublicKeyForTestingPurposesOnly12345678901234567890"

// Track sent notifications for test assertions
interface SentNotification {
  deviceId: string
  payload: PushPayload
}

const sentNotifications: Array<SentNotification> = []

/**
 * Mock WebPushService for testing
 * - Returns a fake VAPID public key
 * - Tracks all "sent" notifications for assertions
 * - Always succeeds
 */
export const WebPushServiceMock = Layer.succeed(
  WebPushService,
  WebPushService.make({
    getPublicKey: Effect.succeed(MOCK_VAPID_PUBLIC_KEY),

    sendNotification: Effect.fn(function*(device: Device, payload: PushPayload) {
      if (!device.pushEndpoint || !device.pushP256dh || !device.pushAuth) {
        yield* Effect.logDebug(`Mock: Device ${device.id} has no push subscription`)
        return false
      }

      // Track the notification
      sentNotifications.push({ deviceId: device.id, payload })
      yield* Effect.logDebug(`Mock: Push notification sent to device ${device.id}`)
      return true
    }),

    sendToDevices: Effect.fn(function*(devices: Array<Device>, payload: PushPayload) {
      const withSubscription = devices.filter((d) => d.pushEndpoint)

      for (const device of withSubscription) {
        sentNotifications.push({ deviceId: device.id, payload })
      }

      yield* Effect.logDebug(
        `Mock: Push sent to ${withSubscription.length}/${devices.length} devices`
      )

      return {
        successCount: withSubscription.length,
        expiredDeviceIds: []
      }
    })
  })
)

/**
 * Get all sent notifications (for test assertions)
 */
export const getSentNotifications = (): ReadonlyArray<SentNotification> => [...sentNotifications]

/**
 * Clear sent notifications (call in beforeEach)
 */
export const clearSentNotifications = (): void => {
  sentNotifications.length = 0
}

/**
 * Get the mock VAPID public key (for test assertions)
 */
export const getMockVapidPublicKey = (): string => MOCK_VAPID_PUBLIC_KEY
