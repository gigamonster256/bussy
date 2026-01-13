/**
 * E2E Tests: Subscription Endpoints
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { ApiErrorResponse, SubscriptionResponse } from "../../src/shared/api.ts"
import { clearDatabase, createClient, randomDeviceId, startTestServer } from "./setup.ts"

describe("E2E: Subscriptions", () => {
  let cleanup: () => Promise<void>
  let client: ReturnType<typeof createClient>
  let deviceId: string

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
    // Create a fresh device for each test
    deviceId = randomDeviceId()
    await client.post("/api/v1/devices", { deviceId })
  })

  const validSubscription = {
    routeId: "route-01",
    directionId: "dir-outbound",
    stopId: "stop-001",
    notifyMinutes: 5,
    timeRangeStart: "07:00",
    timeRangeEnd: "22:00",
    routeName: "T1",
    directionName: "Outbound",
    stopName: "Main Street Station"
  }

  describe("GET /api/v1/devices/:deviceId/subscriptions", () => {
    it("returns empty list initially", async () => {
      const { data, status } = await client.get<Array<SubscriptionResponse>>(
        `/api/v1/devices/${deviceId}/subscriptions`
      )

      expect(status).toBe(200)
      expect(data).toEqual([])
    })

    it("returns all subscriptions for a device", async () => {
      // Create two subscriptions
      await client.post(`/api/v1/devices/${deviceId}/subscriptions`, validSubscription)
      await client.post(`/api/v1/devices/${deviceId}/subscriptions`, {
        ...validSubscription,
        stopId: "stop-002",
        stopName: "University Drive"
      })

      const { data, status } = await client.get<Array<SubscriptionResponse>>(
        `/api/v1/devices/${deviceId}/subscriptions`
      )

      expect(status).toBe(200)
      expect(data.length).toBe(2)
    })
  })

  describe("POST /api/v1/devices/:deviceId/subscriptions", () => {
    it("creates a new subscription", async () => {
      const { data, status } = await client.post<SubscriptionResponse>(
        `/api/v1/devices/${deviceId}/subscriptions`,
        validSubscription
      )

      expect(status).toBe(201)
      expect(data.id).toBeDefined()
      expect(data.deviceId).toBe(deviceId)
      expect(data.routeId).toBe(validSubscription.routeId)
      expect(data.directionId).toBe(validSubscription.directionId)
      expect(data.stopId).toBe(validSubscription.stopId)
      expect(data.notifyMinutes).toBe(validSubscription.notifyMinutes)
      expect(data.timeRangeStart).toBe(validSubscription.timeRangeStart)
      expect(data.timeRangeEnd).toBe(validSubscription.timeRangeEnd)
      expect(data.routeName).toBe(validSubscription.routeName)
      expect(data.directionName).toBe(validSubscription.directionName)
      expect(data.stopName).toBe(validSubscription.stopName)
      expect(data.createdAt).toBeDefined()
    })

    it("auto-creates device if it doesn't exist", async () => {
      const newDeviceId = randomDeviceId()

      const { data, status } = await client.post<SubscriptionResponse>(
        `/api/v1/devices/${newDeviceId}/subscriptions`,
        validSubscription
      )

      expect(status).toBe(201)
      expect(data.deviceId).toBe(newDeviceId)
    })

    it("returns 400 when required fields are missing", async () => {
      const { data, status } = await client.post<ApiErrorResponse>(
        `/api/v1/devices/${deviceId}/subscriptions`,
        { routeId: "route-01" } // missing directionId and stopId
      )

      expect(status).toBe(400)
      expect(data.error).toBe("BAD_REQUEST")
    })

    it("uses defaults for optional fields", async () => {
      const { data } = await client.post<SubscriptionResponse>(
        `/api/v1/devices/${deviceId}/subscriptions`,
        {
          routeId: "route-01",
          directionId: "dir-outbound",
          stopId: "stop-001"
          // No notifyMinutes, timeRangeStart, timeRangeEnd, or names
        }
      )

      expect(data.notifyMinutes).toBe(5) // default
      expect(data.timeRangeStart).toBe("00:00") // default
      expect(data.timeRangeEnd).toBe("23:59") // default
    })
  })

  describe("GET /api/v1/subscriptions/:id", () => {
    it("returns a single subscription", async () => {
      const { data: created } = await client.post<SubscriptionResponse>(
        `/api/v1/devices/${deviceId}/subscriptions`,
        validSubscription
      )

      const { data, status } = await client.get<SubscriptionResponse>(
        `/api/v1/subscriptions/${created.id}`
      )

      expect(status).toBe(200)
      expect(data.id).toBe(created.id)
      expect(data.routeId).toBe(validSubscription.routeId)
    })

    it("returns 404 for non-existent subscription", async () => {
      const fakeId = crypto.randomUUID()

      const { data, status } = await client.get<ApiErrorResponse>(`/api/v1/subscriptions/${fakeId}`)

      expect(status).toBe(404)
      expect(data.error).toBe("NOT_FOUND")
    })
  })

  describe("DELETE /api/v1/subscriptions/:id", () => {
    it("deletes an existing subscription", async () => {
      const { data: created } = await client.post<SubscriptionResponse>(
        `/api/v1/devices/${deviceId}/subscriptions`,
        validSubscription
      )

      const { data, status } = await client.delete<{ success: boolean }>(
        `/api/v1/subscriptions/${created.id}`
      )

      expect(status).toBe(200)
      expect(data.success).toBe(true)

      // Verify it's gone
      const { status: getStatus } = await client.get(`/api/v1/subscriptions/${created.id}`)
      expect(getStatus).toBe(404)
    })

    it("returns 404 for non-existent subscription", async () => {
      const fakeId = crypto.randomUUID()

      const { data, status } = await client.delete<ApiErrorResponse>(
        `/api/v1/subscriptions/${fakeId}`
      )

      expect(status).toBe(404)
      expect(data.error).toBe("NOT_FOUND")
    })
  })
})
