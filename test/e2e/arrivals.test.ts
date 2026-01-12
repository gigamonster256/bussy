/**
 * E2E Tests for Arrivals endpoints
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { clearDatabase, createClient, randomDeviceId, startTestServer } from "./setup.ts"

describe("Arrivals API", () => {
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

  describe("GET /api/v1/routes/:routeId/directions/:directionId/stops/:stopCode/arrivals", () => {
    it("should return arrivals for a stop", async () => {
      // First get routes, directions, and stops to find valid IDs
      const routesRes = await client.get<Array<{ id: string }>>("/api/v1/routes")
      expect(routesRes.status).toBe(200)

      if (routesRes.data.length === 0) {
        // No routes available
        return
      }

      const routeId = routesRes.data[0].id
      const directionsRes = await client.get<Array<{ id: string }>>(`/api/v1/routes/${routeId}/directions`)
      expect(directionsRes.status).toBe(200)

      if (directionsRes.data.length === 0) {
        return
      }

      const directionId = directionsRes.data[0].id
      const stopsRes = await client.get<Array<{ code: string }>>(
        `/api/v1/routes/${routeId}/directions/${directionId}/stops`
      )
      expect(stopsRes.status).toBe(200)

      if (stopsRes.data.length === 0) {
        return
      }

      const stopCode = stopsRes.data[0].code
      const { data, status } = await client.get<Array<unknown>>(
        `/api/v1/routes/${routeId}/directions/${directionId}/stops/${stopCode}/arrivals`
      )

      expect(status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      // Arrivals structure depends on what the API returns
    })

    it("should return empty array for non-existent stop", async () => {
      const { data, status } = await client.get<Array<unknown>>(
        "/api/v1/routes/fake-route/directions/fake-direction/stops/fake-stop/arrivals"
      )

      expect(status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    })
  })

  describe("GET /api/v1/devices/:deviceId/arrivals", () => {
    it("should return empty arrivals for device with no subscriptions", async () => {
      const deviceId = randomDeviceId()

      // Register device first
      await client.post("/api/v1/devices", { deviceId })

      const { data, status } = await client.get<{ arrivals: Record<string, Array<unknown>> }>(
        `/api/v1/devices/${deviceId}/arrivals`
      )

      expect(status).toBe(200)
      expect(data.arrivals).toEqual({})
    })

    it("should return arrivals keyed by subscription id", async () => {
      const deviceId = randomDeviceId()

      // Register device
      await client.post("/api/v1/devices", { deviceId })

      // Create a subscription - we'll use fake IDs which will likely return empty arrivals
      // but the structure should still be correct
      const subRes = await client.post<{ id: string }>(`/api/v1/devices/${deviceId}/subscriptions`, {
        routeId: "test-route",
        directionId: "test-direction",
        stopId: "test-stop"
      })
      expect(subRes.status).toBe(201)
      const subId = subRes.data.id

      const { data, status } = await client.get<{ arrivals: Record<string, Array<unknown>> }>(
        `/api/v1/devices/${deviceId}/arrivals`
      )

      expect(status).toBe(200)
      expect(data.arrivals).toBeDefined()
      // Should have an entry for our subscription
      expect(subId in data.arrivals).toBe(true)
      expect(Array.isArray(data.arrivals[subId])).toBe(true)
    })

    it("should return arrivals for multiple subscriptions", async () => {
      const deviceId = randomDeviceId()

      // Register device
      await client.post("/api/v1/devices", { deviceId })

      // Create multiple subscriptions
      const sub1Res = await client.post<{ id: string }>(`/api/v1/devices/${deviceId}/subscriptions`, {
        routeId: "route-1",
        directionId: "dir-1",
        stopId: "stop-1"
      })
      const sub2Res = await client.post<{ id: string }>(`/api/v1/devices/${deviceId}/subscriptions`, {
        routeId: "route-2",
        directionId: "dir-2",
        stopId: "stop-2"
      })

      expect(sub1Res.status).toBe(201)
      expect(sub2Res.status).toBe(201)

      const { data, status } = await client.get<{ arrivals: Record<string, Array<unknown>> }>(
        `/api/v1/devices/${deviceId}/arrivals`
      )

      expect(status).toBe(200)
      expect(Object.keys(data.arrivals)).toHaveLength(2)
      expect(sub1Res.data.id in data.arrivals).toBe(true)
      expect(sub2Res.data.id in data.arrivals).toBe(true)
    })
  })
})
