/**
 * Production API E2E Tests
 *
 * These tests run against the REAL Aggie Spirit API and are opt-in.
 * Run with: TEST_PRODUCTION_API=1 bun run test test/e2e/production.test.ts
 *
 * Unlike other E2E tests that use USE_MOCK_API=1, these tests start the
 * server WITHOUT the mock flag to verify real API integration works.
 */

import type { ChildProcess } from "child_process"
import { spawn } from "child_process"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const TEST_PORT = 3098
const TEST_DB_URL = "mysql://bussy:bussy@localhost:3306/bussy_test"

// Only run these tests if explicitly enabled
const runProductionTests = Boolean(process.env.TEST_PRODUCTION_API)

// Valid VAPID keys for testing
const TEST_VAPID_PUBLIC_KEY = "BNuJhqY1ikFZ_TEdW2ZiB7jgpDalsxwSH-KFV-JJ1xKx1C6leB9i5yqMAYV-WUi6voEHQsVHK-H-VNzwlSpP8s4"
const TEST_VAPID_PRIVATE_KEY = "_1m4IhAygijMLq-byn9SBhqNm88scRrlh1TBAuQI-E0"

let serverProcess: ChildProcess | null = null
let baseUrl: string

async function startProductionServer(): Promise<void> {
  if (serverProcess) {
    throw new Error("Production server already running")
  }

  baseUrl = `http://127.0.0.1:${TEST_PORT}`

  // Start server WITHOUT USE_MOCK_API (uses real Aggie Spirit API)
  serverProcess = spawn("bun", ["run", "src/Program.ts"], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      LISTEN_ADDR: "127.0.0.1",
      DATABASE_URL: TEST_DB_URL,
      VAPID_PUBLIC_KEY: TEST_VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY: TEST_VAPID_PRIVATE_KEY,
      VAPID_SUBJECT: "mailto:test@example.com",
      TRACING_EXPORTER: "console"
      // NOTE: USE_MOCK_API is NOT set - this uses the real API
    },
    stdio: ["ignore", "pipe", "pipe"]
  })

  // Wait for server to be ready
  const maxWait = 15000
  const pollInterval = 100
  let waited = 0

  while (waited < maxWait) {
    try {
      const res = await fetch(`${baseUrl}/api/v1/health`)
      if (res.ok) {
        break
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, pollInterval))
    waited += pollInterval
  }

  if (waited >= maxWait) {
    serverProcess.kill()
    serverProcess = null
    throw new Error("Production test server failed to start within timeout")
  }
}

async function stopProductionServer(): Promise<void> {
  if (serverProcess) {
    serverProcess.kill("SIGTERM")
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        serverProcess?.kill("SIGKILL")
        resolve()
      }, 5000)

      serverProcess?.on("exit", () => {
        clearTimeout(timeout)
        resolve()
      })
    })
    serverProcess = null
  }
}

describe.skipIf(!runProductionTests)("Production API E2E Tests", () => {
  beforeAll(async () => {
    await startProductionServer()
  })

  afterAll(async () => {
    await stopProductionServer()
  })

  describe("Routes from Real API", () => {
    it("should return real routes from Aggie Spirit API", async () => {
      const res = await fetch(`${baseUrl}/api/v1/routes`)
      expect(res.ok).toBe(true)

      const routes = (await res.json()) as Array<{ id: string; name: string; shortName: string }>
      expect(Array.isArray(routes)).toBe(true)

      // Real API should return actual routes
      expect(routes.length).toBeGreaterThan(0)

      // Verify route structure
      const route = routes[0]
      expect(route).toHaveProperty("id")
      expect(route).toHaveProperty("name")
      expect(route).toHaveProperty("shortName")
    })

    it("should return directions for a real route", async () => {
      // Get routes first
      const routesRes = await fetch(`${baseUrl}/api/v1/routes`)
      const routes = (await routesRes.json()) as Array<{ id: string }>

      expect(routes.length).toBeGreaterThan(0)
      const routeId = routes[0].id

      // Get directions
      const directionsRes = await fetch(`${baseUrl}/api/v1/routes/${routeId}/directions`)
      expect(directionsRes.ok).toBe(true)

      const directions = (await directionsRes.json()) as Array<{ id: string; name: string }>
      expect(Array.isArray(directions)).toBe(true)
      expect(directions.length).toBeGreaterThan(0)

      // Verify direction structure
      const direction = directions[0]
      expect(direction).toHaveProperty("id")
      expect(direction).toHaveProperty("name")
    })

    it("should return stops for a real route direction", async () => {
      // Get routes
      const routesRes = await fetch(`${baseUrl}/api/v1/routes`)
      const routes = (await routesRes.json()) as Array<{ id: string }>
      expect(routes.length).toBeGreaterThan(0)

      const routeId = routes[0].id

      // Get directions
      const directionsRes = await fetch(`${baseUrl}/api/v1/routes/${routeId}/directions`)
      const directions = (await directionsRes.json()) as Array<{ id: string }>
      expect(directions.length).toBeGreaterThan(0)

      const directionId = directions[0].id

      // Get stops
      const stopsRes = await fetch(`${baseUrl}/api/v1/routes/${routeId}/directions/${directionId}/stops`)
      expect(stopsRes.ok).toBe(true)

      const stops = (await stopsRes.json()) as Array<{ code: string; name: string }>
      expect(Array.isArray(stops)).toBe(true)
      expect(stops.length).toBeGreaterThan(0)

      // Verify stop structure
      const stop = stops[0]
      expect(stop).toHaveProperty("code")
      expect(stop).toHaveProperty("name")
    })
  })

  describe("Arrivals from Real API", () => {
    it("should fetch real arrivals for a stop", async () => {
      // Navigate to a stop
      const routesRes = await fetch(`${baseUrl}/api/v1/routes`)
      const routes = (await routesRes.json()) as Array<{ id: string }>
      expect(routes.length).toBeGreaterThan(0)

      const routeId = routes[0].id

      const directionsRes = await fetch(`${baseUrl}/api/v1/routes/${routeId}/directions`)
      const directions = (await directionsRes.json()) as Array<{ id: string }>
      expect(directions.length).toBeGreaterThan(0)

      const directionId = directions[0].id

      const stopsRes = await fetch(`${baseUrl}/api/v1/routes/${routeId}/directions/${directionId}/stops`)
      const stops = (await stopsRes.json()) as Array<{ code: string }>
      expect(stops.length).toBeGreaterThan(0)

      const stopCode = stops[0].code

      // Get arrivals
      const arrivalsRes = await fetch(
        `${baseUrl}/api/v1/routes/${routeId}/directions/${directionId}/stops/${stopCode}/arrivals`
      )
      expect(arrivalsRes.ok).toBe(true)

      const arrivals = (await arrivalsRes.json()) as Array<unknown>
      expect(Array.isArray(arrivals)).toBe(true)
      // Arrivals may be empty if no buses are running, but the structure should be an array
    })
  })

  describe("Health Check", () => {
    it("should report healthy with real API", async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`)
      expect(res.ok).toBe(true)

      const data = (await res.json()) as { status: string }
      expect(data.status).toBe("ok")
    })
  })
})
