import { Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import type { Device } from "../../src/db/index.ts"
import {
  clearSentNotifications,
  getMockVapidPublicKey,
  getSentNotifications,
  WebPushServiceMock
} from "../mocks/WebPushService.ts"
import { WebPushService } from "../../src/services/WebPushService.ts"

describe("WebPushService", () => {
  beforeEach(() => {
    clearSentNotifications()
  })

  describe("getPublicKey", () => {
    it("should return the VAPID public key", async () => {
      const program = Effect.gen(function*() {
        const pushService = yield* WebPushService
        const publicKey = yield* pushService.getPublicKey
        expect(publicKey).toBe(getMockVapidPublicKey())
      })

      await Effect.runPromise(program.pipe(Effect.provide(WebPushServiceMock)))
    })
  })

  describe("sendNotification", () => {
    it("should return false for device without push subscription", async () => {
      const device: Device = {
        id: "device-1",
        pushEndpoint: null,
        pushP256dh: null,
        pushAuth: null,
        createdAt: new Date(),
        lastSeenAt: new Date()
      }

      const program = Effect.gen(function*() {
        const pushService = yield* WebPushService
        const result = yield* pushService.sendNotification(device, {
          title: "Test",
          body: "Test body"
        })
        expect(result).toBe(false)
      })

      await Effect.runPromise(program.pipe(Effect.provide(WebPushServiceMock)))

      // Should not track notification for device without subscription
      expect(getSentNotifications()).toHaveLength(0)
    })

    it("should send notification to device with push subscription", async () => {
      const device: Device = {
        id: "device-1",
        pushEndpoint: "https://push.example.com/send/abc",
        pushP256dh: "p256dh-key",
        pushAuth: "auth-key",
        createdAt: new Date(),
        lastSeenAt: new Date()
      }

      const payload = {
        title: "Bus Arriving!",
        body: "Route 12 is 3 minutes away",
        tag: "arrival-123"
      }

      const program = Effect.gen(function*() {
        const pushService = yield* WebPushService
        const result = yield* pushService.sendNotification(device, payload)
        expect(result).toBe(true)
      })

      await Effect.runPromise(program.pipe(Effect.provide(WebPushServiceMock)))

      const sent = getSentNotifications()
      expect(sent).toHaveLength(1)
      expect(sent[0].deviceId).toBe("device-1")
      expect(sent[0].payload.title).toBe("Bus Arriving!")
      expect(sent[0].payload.body).toBe("Route 12 is 3 minutes away")
    })
  })

  describe("sendToDevices", () => {
    it("should send to multiple devices with subscriptions", async () => {
      const devices: Array<Device> = [
        {
          id: "device-1",
          pushEndpoint: "https://push.example.com/1",
          pushP256dh: "key1",
          pushAuth: "auth1",
          createdAt: new Date(),
          lastSeenAt: new Date()
        },
        {
          id: "device-2",
          pushEndpoint: null, // No subscription
          pushP256dh: null,
          pushAuth: null,
          createdAt: new Date(),
          lastSeenAt: new Date()
        },
        {
          id: "device-3",
          pushEndpoint: "https://push.example.com/3",
          pushP256dh: "key3",
          pushAuth: "auth3",
          createdAt: new Date(),
          lastSeenAt: new Date()
        }
      ]

      const payload = {
        title: "Broadcast",
        body: "Test message"
      }

      const program = Effect.gen(function*() {
        const pushService = yield* WebPushService
        const result = yield* pushService.sendToDevices(devices, payload)

        // Only 2 devices have subscriptions
        expect(result.successCount).toBe(2)
        expect(result.expiredDeviceIds).toHaveLength(0)
      })

      await Effect.runPromise(program.pipe(Effect.provide(WebPushServiceMock)))

      const sent = getSentNotifications()
      expect(sent).toHaveLength(2)
      expect(sent.map((s) => s.deviceId).sort()).toEqual(["device-1", "device-3"])
    })

    it("should return empty results for devices without subscriptions", async () => {
      const devices: Array<Device> = [
        {
          id: "device-1",
          pushEndpoint: null,
          pushP256dh: null,
          pushAuth: null,
          createdAt: new Date(),
          lastSeenAt: new Date()
        }
      ]

      const program = Effect.gen(function*() {
        const pushService = yield* WebPushService
        const result = yield* pushService.sendToDevices(devices, {
          title: "Test",
          body: "Test"
        })

        expect(result.successCount).toBe(0)
        expect(result.expiredDeviceIds).toHaveLength(0)
      })

      await Effect.runPromise(program.pipe(Effect.provide(WebPushServiceMock)))

      expect(getSentNotifications()).toHaveLength(0)
    })
  })
})
