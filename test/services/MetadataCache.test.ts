import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import { makeAggieSpiritApiMock } from "../mocks/AggieSpiritApi.ts"
import { MetadataCache } from "../../src/services/MetadataCache.ts"
import type { Route, Stop } from "../../src/shared/domain.ts"

const mockRoutes: Array<Route> = [
  {
    id: "01",
    name: "Route 1",
    shortName: "R1",
    directionList: [
      {
        id: "d1",
        name: "Outbound",
        destination: "Dest A",
        patternList: [{ id: "p1", isDisplay: true, geometry: [] }]
      }
    ]
  }
]

const mockStops: Array<Stop> = [
  { code: "s1", name: "Stop 1", location: { lat: 10, lon: 10 } }
]

const MockAggieSpiritApi = makeAggieSpiritApiMock(mockRoutes, mockStops)

// Use DefaultWithoutDependencies to inject mock API
const TestLayer = MetadataCache.DefaultWithoutDependencies.pipe(
  Layer.provide(MockAggieSpiritApi)
)

describe("MetadataCache", () => {
  it("should cache routes on startup", async () => {
    const program = Effect.gen(function*() {
      const cache = yield* MetadataCache
      const routes = yield* cache.getRoutes()
      expect(routes).toEqual(mockRoutes)
    })

    await Effect.runPromise(
      program.pipe(
        Effect.provide(TestLayer)
      )
    )
  })

  it("should fetch and cache stops", async () => {
    const program = Effect.gen(function*() {
      const cache = yield* MetadataCache
      const stops1 = yield* cache.getStops("01", "d1")
      expect(stops1).toEqual(mockStops)
    })

    await Effect.runPromise(
      program.pipe(
        Effect.provide(TestLayer)
      )
    )
  })
})
