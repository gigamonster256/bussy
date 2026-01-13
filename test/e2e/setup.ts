/**
 * E2E Test Setup using Effect's HttpApp testing pattern
 *
 * This approach converts the HttpApp to a web handler with all dependencies
 * provided via layers. No test code pollutes the production codebase.
 */

import { HttpApp } from "@effect/platform"
import { BunContext } from "@effect/platform-bun"
import { ConfigProvider, Layer, ManagedRuntime } from "effect"
import { createPool } from "mysql2/promise"

import { DatabaseService } from "../../src/db/index.ts"
import { makeAggieSpiritApiMock } from "../mocks/AggieSpiritApi.ts"
import {
  clearSentNotifications,
  getMockVapidPublicKey,
  getSentNotifications,
  WebPushServiceMock
} from "../mocks/WebPushService.ts"
import { HttpApp as AppHttpApp } from "../../src/server/index.ts"
import { MetadataCache } from "../../src/services/MetadataCache.ts"
import { NameResolver } from "../../src/services/NameResolver.ts"
import type { Route, Stop } from "../../src/shared/domain.ts"

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_DB_URL = "mysql://bussy:bussy@localhost:3306/bussy_test"

// ============================================================================
// Mock Data
// ============================================================================

export const mockRoutes: Array<Route> = [
  {
    id: "route-01",
    name: "Test Route 1",
    shortName: "T1",
    directionList: [
      {
        id: "dir-outbound",
        name: "Outbound",
        destination: "Campus",
        patternList: [{ id: "pattern-1", isDisplay: true, geometry: [] }]
      },
      {
        id: "dir-inbound",
        name: "Inbound",
        destination: "Downtown",
        patternList: [{ id: "pattern-2", isDisplay: true, geometry: [] }]
      }
    ]
  },
  {
    id: "route-02",
    name: "Test Route 2",
    shortName: "T2",
    directionList: [
      {
        id: "dir-loop",
        name: "Loop",
        destination: "Campus Loop",
        patternList: [{ id: "pattern-3", isDisplay: true, geometry: [] }]
      }
    ]
  }
]

export const mockStops: Array<Stop> = [
  { code: "stop-001", name: "Main Street Station", location: { lat: 30.6187, lon: -96.3365 } },
  { code: "stop-002", name: "University Center", location: { lat: 30.615, lon: -96.34 } },
  { code: "stop-003", name: "Library", location: { lat: 30.62, lon: -96.335 } }
]

// ============================================================================
// Test Layers
// ============================================================================

/**
 * Mock AggieSpiritApi layer with test data
 */
const MockAggieSpiritApiLayer = makeAggieSpiritApiMock(mockRoutes, mockStops)

/**
 * Mock MetadataCache that uses the mock API
 */
const MockMetadataCacheLayer = MetadataCache.DefaultWithoutDependencies.pipe(
  Layer.provide(MockAggieSpiritApiLayer)
)

/**
 * Mock NameResolver that uses the mock MetadataCache
 */
const MockNameResolverLayer = NameResolver.DefaultWithoutDependencies.pipe(
  Layer.provide(MockMetadataCacheLayer)
)

/**
 * Test config provider with all required config values
 */
const TestConfigProvider = ConfigProvider.fromJson({
  DATABASE_URL: TEST_DB_URL
})

/**
 * Combined test layer with all dependencies for the HttpApp
 */
const TestLayer = Layer.mergeAll(
  MockAggieSpiritApiLayer,
  MockMetadataCacheLayer,
  MockNameResolverLayer,
  WebPushServiceMock,
  DatabaseService.Default,
  BunContext.layer // Provides HttpPlatform for file operations
).pipe(Layer.provide(Layer.setConfigProvider(TestConfigProvider)))

// ============================================================================
// Test Server
// ============================================================================

export interface TestContext {
  client: ReturnType<typeof createClient>
  cleanup: () => Promise<void>
}

let managedRuntime: ManagedRuntime.ManagedRuntime<any, any> | null = null
let webHandler: ((request: Request) => Promise<Response>) | null = null

/**
 * Start the test server (in-process)
 * Returns a client for making requests
 */
export async function startTestServer(): Promise<TestContext> {
  // Create a managed runtime with our test layer
  managedRuntime = ManagedRuntime.make(TestLayer)

  // Run the AppHttpApp effect to get the router
  const router = await managedRuntime.runPromise(AppHttpApp)

  // Get the runtime to create the web handler
  const runtime = await managedRuntime.runtime()

  // Convert the router to a web handler using the runtime
  webHandler = HttpApp.toWebHandlerRuntime(runtime)(router)

  return {
    client: createClient(),
    cleanup: async () => {
      if (managedRuntime) {
        await managedRuntime.dispose()
        managedRuntime = null
        webHandler = null
      }
    }
  }
}

/**
 * Clear all data from the test database
 * Call this in beforeEach to ensure test isolation
 */
export async function clearDatabase(): Promise<void> {
  const pool = createPool(TEST_DB_URL)

  try {
    // Disable foreign key checks temporarily
    await pool.query("SET FOREIGN_KEY_CHECKS = 0")
    await pool.query("TRUNCATE TABLE subscriptions")
    await pool.query("TRUNCATE TABLE devices")
    await pool.query("SET FOREIGN_KEY_CHECKS = 1")
  } finally {
    await pool.end()
  }

  // Also clear mock state
  clearSentNotifications()
}

/**
 * Helper to make JSON requests to the test server
 */
export function createClient() {
  const baseUrl = "http://localhost" // URL doesn't matter for in-process handler

  const makeRequest = async <T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ status: number; data: T }> => {
    if (!webHandler) {
      throw new Error("Test server not started. Call startTestServer() first.")
    }

    const url = `${baseUrl}${path}`
    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" }
    }
    if (body !== undefined) {
      options.body = JSON.stringify(body)
    }

    const request = new Request(url, options)
    const response = await webHandler(request)
    const data = (await response.json()) as T

    return { status: response.status, data }
  }

  return {
    async get<T>(path: string): Promise<{ status: number; data: T }> {
      return makeRequest<T>("GET", path)
    },

    async post<T>(path: string, body?: unknown): Promise<{ status: number; data: T }> {
      return makeRequest<T>("POST", path, body)
    },

    async delete<T>(path: string): Promise<{ status: number; data: T }> {
      return makeRequest<T>("DELETE", path)
    }
  }
}

/**
 * Generate a random device ID for testing
 */
export function randomDeviceId(): string {
  return crypto.randomUUID()
}

/**
 * Get the test VAPID public key (for test assertions)
 */
export function getTestVapidPublicKey(): string {
  return getMockVapidPublicKey()
}

/**
 * Get sent notifications from the mock WebPushService
 */
export { getSentNotifications }
