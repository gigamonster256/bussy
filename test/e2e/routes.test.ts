/**
 * E2E Tests for Routes/Directions/Stops metadata endpoints
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { clearDatabase, createClient, startTestServer } from "./setup.ts"

describe("Routes API", () => {
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

  describe("GET /api/v1/routes", () => {
    it("should return a list of routes", async () => {
      const { data, status } = await client.get<Array<unknown>>("/api/v1/routes")

      expect(status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      // The actual routes depend on the AggieSpiritApi/MetadataCache
      // We just verify the endpoint returns an array
    })
  })

  describe("GET /api/v1/routes/:routeId/directions", () => {
    it("should return directions for a route", async () => {
      // First get routes to find a valid routeId
      const routesRes = await client.get<Array<{ id: string }>>("/api/v1/routes")
      expect(routesRes.status).toBe(200)

      if (routesRes.data.length === 0) {
        // No routes available (could be API issue or mock)
        // Skip the rest of this test
        return
      }

      const routeId = routesRes.data[0].id
      const { data, status } = await client.get<Array<unknown>>(`/api/v1/routes/${routeId}/directions`)

      expect(status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it("should return empty array for non-existent route", async () => {
      const { data, status } = await client.get<Array<unknown>>("/api/v1/routes/non-existent-route/directions")

      expect(status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    })
  })

  describe("GET /api/v1/routes/:routeId/directions/:directionId/stops", () => {
    it("should return stops for a route direction", async () => {
      // First get routes and directions to find valid IDs
      const routesRes = await client.get<Array<{ id: string }>>("/api/v1/routes")
      expect(routesRes.status).toBe(200)

      if (routesRes.data.length === 0) {
        return
      }

      const routeId = routesRes.data[0].id
      const directionsRes = await client.get<Array<{ id: string }>>(`/api/v1/routes/${routeId}/directions`)
      expect(directionsRes.status).toBe(200)

      if (directionsRes.data.length === 0) {
        return
      }

      const directionId = directionsRes.data[0].id
      const { data, status } = await client.get<Array<unknown>>(
        `/api/v1/routes/${routeId}/directions/${directionId}/stops`
      )

      expect(status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it("should return empty array for non-existent route/direction", async () => {
      const { data, status } = await client.get<Array<unknown>>(
        "/api/v1/routes/fake-route/directions/fake-direction/stops"
      )

      expect(status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    })
  })
})
