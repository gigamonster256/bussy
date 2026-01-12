/**
 * E2E Tests for Push notification endpoints
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { clearDatabase, createClient, randomDeviceId, startTestServer } from "./setup.ts"

describe("Push API", () => {
  let cleanup: () => Promise<void>
  let client: ReturnType<typeof createClient>

  beforeAll(async () => {
    const ctx = await startTestServer()
    cleanup = ctx.cleanup
    client = createClient()
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(async () => {
    await clearDatabase()
  })

  describe("GET /api/v1/push/vapid-key", () => {
    it("should return the VAPID public key", async () => {
      const { data, status } = await client.get<{ publicKey: string }>("/api/v1/push/vapid-key")

      expect(status).toBe(200)
      expect(data.publicKey).toBeDefined()
      expect(typeof data.publicKey).toBe("string")
      expect(data.publicKey.length).toBeGreaterThan(0)
    })
  })

  describe("POST /api/v1/devices/:deviceId/push", () => {
    it("should register a push subscription for a device", async () => {
      const deviceId = randomDeviceId()

      // Register device first
      await client.post("/api/v1/devices", { deviceId })

      const pushSubscription = {
        subscription: {
          endpoint: "https://push.example.com/send/abc123",
          keys: {
            p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
            auth: "tBHItJI5svbpez7KI4CCXg"
          }
        }
      }

      const { data, status } = await client.post<{ success: boolean }>(
        `/api/v1/devices/${deviceId}/push`,
        pushSubscription
      )

      expect(status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should return 400 for invalid push subscription data", async () => {
      const deviceId = randomDeviceId()

      // Register device first
      await client.post("/api/v1/devices", { deviceId })

      // Missing endpoint
      const { status: status1 } = await client.post<{ error: string }>(
        `/api/v1/devices/${deviceId}/push`,
        { subscription: { keys: { p256dh: "abc", auth: "def" } } }
      )
      expect(status1).toBe(400)

      // Missing keys
      const { status: status2 } = await client.post<{ error: string }>(
        `/api/v1/devices/${deviceId}/push`,
        { subscription: { endpoint: "https://push.example.com" } }
      )
      expect(status2).toBe(400)

      // Empty subscription
      const { status: status3 } = await client.post<{ error: string }>(
        `/api/v1/devices/${deviceId}/push`,
        {}
      )
      expect(status3).toBe(400)
    })

    it("should update push subscription if called again", async () => {
      const deviceId = randomDeviceId()

      // Register device first
      await client.post("/api/v1/devices", { deviceId })

      const pushSubscription1 = {
        subscription: {
          endpoint: "https://push.example.com/send/first",
          keys: { p256dh: "key1", auth: "auth1" }
        }
      }

      const pushSubscription2 = {
        subscription: {
          endpoint: "https://push.example.com/send/second",
          keys: { p256dh: "key2", auth: "auth2" }
        }
      }

      // Register first subscription
      const res1 = await client.post<{ success: boolean }>(
        `/api/v1/devices/${deviceId}/push`,
        pushSubscription1
      )
      expect(res1.status).toBe(200)

      // Register second subscription (should update)
      const res2 = await client.post<{ success: boolean }>(
        `/api/v1/devices/${deviceId}/push`,
        pushSubscription2
      )
      expect(res2.status).toBe(200)
      expect(res2.data.success).toBe(true)
    })
  })

  describe("DELETE /api/v1/devices/:deviceId/push", () => {
    it("should unsubscribe from push notifications", async () => {
      const deviceId = randomDeviceId()

      // Register device and push subscription
      await client.post("/api/v1/devices", { deviceId })
      await client.post(`/api/v1/devices/${deviceId}/push`, {
        subscription: {
          endpoint: "https://push.example.com/send/abc123",
          keys: { p256dh: "key", auth: "auth" }
        }
      })

      // Unsubscribe
      const { data, status } = await client.delete<{ success: boolean }>(
        `/api/v1/devices/${deviceId}/push`
      )

      expect(status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should succeed even if no push subscription exists", async () => {
      const deviceId = randomDeviceId()

      // Register device without push subscription
      await client.post("/api/v1/devices", { deviceId })

      // Try to unsubscribe - should still succeed
      const { data, status } = await client.delete<{ success: boolean }>(
        `/api/v1/devices/${deviceId}/push`
      )

      expect(status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("should succeed for non-existent device", async () => {
      // Try to unsubscribe for device that doesn't exist
      // The endpoint clears push subscription by setting to empty string,
      // which may or may not create the device depending on implementation
      const { data, status } = await client.delete<{ success: boolean }>(
        `/api/v1/devices/${randomDeviceId()}/push`
      )

      // This may return 200 (silently succeeds) or could error
      // Based on the server code, it just calls updatePushSubscription with empty strings
      expect(status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
