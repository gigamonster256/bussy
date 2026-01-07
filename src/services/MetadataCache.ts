import { Cache, Config, Duration, Effect } from "effect"
import type { Stop } from "../domain.js"
import { AggieSpiritApi } from "./AggieSpiritApi.js"

export class MetadataCache extends Effect.Service<MetadataCache>()("MetadataCache", {
  effect: Effect.gen(function*() {
    const api = yield* AggieSpiritApi

    const routesCache = yield* Cache.make({
      capacity: 1,
      timeToLive: yield* Config.duration("API_METADATA_TTL").pipe(Config.withDefault(Duration.minutes(10))),
      lookup: () =>
        Effect.gen(function*() {
          const routes = yield* api.getBaseData()
          yield* Effect.logInfo(`MetadataCache routes refreshed: ${routes.length} routes loaded`)
          return routes
        })
    })

    const stopsCache = yield* Cache.make({
      capacity: 1000,
      timeToLive: yield* Config.duration("API_METADATA_TTL").pipe(Config.withDefault(Duration.minutes(10))),
      lookup: (key: string) =>
        Effect.gen(function*() {
          const [routeId, directionId] = key.split(":")
          const routes = yield* routesCache.get("routes")

          const route = routes.find((r) => r.id === routeId)
          if (!route) return []

          const direction = route.directionList.find((d) => d.id === directionId)
          if (!direction) return []

          const patternIds = direction.patternList.map((p) => p.id)
          if (patternIds.length === 0) return []

          const patterns = yield* api.getPatternPaths(routeId, patternIds)

          const pattern = patterns.filter((p) => p.directionId === directionId)
          if (pattern.length === 0) return []

          const stopsMap = new Map<string, Stop>()
          for (const p of pattern) {
            for (const stop of p.stops) {
              if (!stopsMap.has(stop.code)) {
                stopsMap.set(stop.code, stop)
              }
            }
          }

          return Array.from(stopsMap.values())
        })
    })

    return {
      getRoutes: Effect.gen(function*() {
        return yield* routesCache.get("routes") // singleton cache so key doesnt matter
      }),

      getDirections: (routeId: string) =>
        Effect.gen(function*() {
          const routes = yield* routesCache.get("routes")
          const route = routes.find((r) => r.id === routeId)
          return route ? route.directionList : []
        }),

      getStops: (routeId: string, directionId: string) =>
        Effect.gen(function*() {
          const cacheKey = `${routeId}:${directionId}`
          return yield* stopsCache.get(cacheKey)
        })
    }
  }),
  dependencies: [AggieSpiritApi.Default]
}) {
}
