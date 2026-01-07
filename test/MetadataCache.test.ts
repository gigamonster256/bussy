import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import type { Route, Stop } from "../src/domain.js"
import { makeAggieSpiritApiMock } from "../src/mocks/AggieSpiritApi.js"
import { AggieSpiritAuthMock } from "../src/mocks/AggieSpiritAuth.js"
import { MetadataCache } from "../src/services/MetadataCache.js"

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

const MockAggieSpiritAuth = AggieSpiritAuthMock
const MockAggieSpiritApi = makeAggieSpiritApiMock(mockRoutes, mockStops)

describe("MetadataCache", () => {
  it("should cache routes on startup", async () => {
    const program = Effect.gen(function*() {
      const cache = yield* MetadataCache

      const routes = yield* cache.getRoutes
      expect(routes).toEqual(mockRoutes)
    })

    const TestLayer = MetadataCache.Default.pipe(
      Layer.provide(MockAggieSpiritApi),
      Layer.provide(MockAggieSpiritAuth)
    )

    await Effect.runPromise(
      program.pipe(Effect.provide(TestLayer))
    )
  })

  it("should fetch and cache stops", async () => {
    const program = Effect.gen(function*() {
      const cache = yield* MetadataCache

      const stops1 = yield* cache.getStops("01", "d1")
      expect(stops1).toEqual(mockStops)

      const stops2 = yield* cache.getStops("01", "d1")
      expect(stops2).toEqual(mockStops)
    })

    const TestLayer = MetadataCache.Default.pipe(
      Layer.provide(MockAggieSpiritApi),
      Layer.provide(MockAggieSpiritAuth)
    )

    await Effect.runPromise(
      program.pipe(Effect.provide(TestLayer))
    )
  })
})
