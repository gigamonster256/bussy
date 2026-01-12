/**
 * E2E Tests: Device Endpoints
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { ApiErrorResponse, RegisterDeviceResponse } from "../../src/shared/api.ts"
import { clearDatabase, createClient, randomDeviceId, startTestServer } from "./setup.ts"

describe("E2E: Devices", () => {
  let cleanup: () => Promise<void>
  let client: ReturnType<typeof createClient>

  beforeAll(async () => {
    const server = await startTestServer()
    cleanup = server.cleanup
    client = createClient()
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(async () => {
    await clearDatabase()
  })

  describe("POST /api/v1/devices", () => {
    it("registers a new device", async () => {
      const deviceId = randomDeviceId()

      const { data, status } = await client.post<RegisterDeviceResponse>("/api/v1/devices", {
        deviceId
      })

      expect(status).toBe(200)
      expect(data.deviceId).toBe(deviceId)
      expect(data.createdAt).toBeDefined()
      // Verify it's a valid ISO date
      expect(() => new Date(data.createdAt)).not.toThrow()
    })

    it("returns existing device on duplicate registration (upsert)", async () => {
      const deviceId = randomDeviceId()

      // First registration
      const { data: first } = await client.post<RegisterDeviceResponse>("/api/v1/devices", {
        deviceId
      })

      // Wait a bit to ensure lastSeenAt would be different
      await new Promise((r) => setTimeout(r, 100))

      // Second registration (upsert)
      const { data: second, status } = await client.post<RegisterDeviceResponse>(
        "/api/v1/devices",
        { deviceId }
      )

      expect(status).toBe(200)
      expect(second.deviceId).toBe(deviceId)
      // createdAt should be the same (not recreated)
      expect(second.createdAt).toBe(first.createdAt)
    })

    it("returns 400 when deviceId is missing", async () => {
      const { data, status } = await client.post<ApiErrorResponse>("/api/v1/devices", {})

      expect(status).toBe(400)
      expect(data.error).toBe("BAD_REQUEST")
      expect(data.message).toContain("deviceId")
    })
  })

  describe("DELETE /api/v1/devices/:deviceId", () => {
    it("deletes an existing device", async () => {
      const deviceId = randomDeviceId()

      // Register the device first
      await client.post("/api/v1/devices", { deviceId })

      // Delete the device
      const { data, status } = await client.delete<{ success: boolean }>(
        `/api/v1/devices/${deviceId}`
      )

      expect(status).toBe(200)
      expect(data.success).toBe(true)
    })

    it("returns 404 for non-existent device", async () => {
      const nonExistentId = randomDeviceId()

      const { data, status } = await client.delete<ApiErrorResponse>(
        `/api/v1/devices/${nonExistentId}`
      )

      expect(status).toBe(404)
      expect(data.error).toBe("NOT_FOUND")
    })

    it("also deletes all device subscriptions", async () => {
      const deviceId = randomDeviceId()

      // Register device and create a subscription
      await client.post("/api/v1/devices", { deviceId })
      await client.post(`/api/v1/devices/${deviceId}/subscriptions`, {
        routeId: "route-01",
        directionId: "dir-outbound",
        stopId: "stop-001",
        notifyMinutes: 5,
        timeRangeStart: "07:00",
        timeRangeEnd: "22:00",
        routeName: "Test Route",
        directionName: "Outbound",
        stopName: "Main Street"
      })

      // Verify subscription exists
      const { data: subs } = await client.get<Array<unknown>>(
        `/api/v1/devices/${deviceId}/subscriptions`
      )
      expect(subs.length).toBe(1)

      // Delete the device
      await client.delete(`/api/v1/devices/${deviceId}`)

      // Re-register the device
      await client.post("/api/v1/devices", { deviceId })

      // Verify subscriptions are gone
      const { data: subsAfter } = await client.get<Array<unknown>>(
        `/api/v1/devices/${deviceId}/subscriptions`
      )
      expect(subsAfter.length).toBe(0)
    })
  })
})
