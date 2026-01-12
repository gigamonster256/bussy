/**
 * E2E Tests: Health Endpoint
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient, startTestServer } from "./setup.ts"

describe("E2E: Health", () => {
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

  it("GET /api/v1/health returns 200 with status ok", async () => {
    const { data, status } = await client.get<{ status: string }>("/api/v1/health")

    expect(status).toBe(200)
    expect(data).toEqual({ status: "ok" })
  })
})
