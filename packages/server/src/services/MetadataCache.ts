import { Cache, Config, Duration, Effect } from "effect"
import type { Stop } from "../shared/domain"
import { AggieSpiritApi } from "./AggieSpiritApi"

export class MetadataCache extends Effect.Service<MetadataCache>()("MetadataCache", {
  effect: Effect.gen(function*() {
    const api = yield* AggieSpiritApi

    const routesCache = yield* Cache.make({
      capacity: 1,
      timeToLive: yield* Config.duration("API_METADATA_TTL").pipe(Config.withDefault(Duration.minutes(10))),
      lookup: Effect.fn(function*() {
        const routes = yield* api.getBaseData()
        yield* Effect.logInfo(`MetadataCache routes refreshed: ${routes.length} routes loaded`)
        return routes
      })
    })

    const stopsCache = yield* Cache.make({
      capacity: 1000,
      timeToLive: yield* Config.duration("API_METADATA_TTL").pipe(Config.withDefault(Duration.minutes(10))),
      lookup: Effect.fn(function*(key: string) {
        const [routeID, directionID] = key.split(":")
        const routes = yield* routesCache.get("routes")

        const route = routes.find((r) => r.id === routeID)
        if (!route) return []

        const direction = route.directionList.find((d) => d.id === directionID)
        if (!direction) return []

        const patternIds = direction.patternList.map((p) => p.id)
        if (patternIds.length === 0) return []

        const patterns = yield* api.getPatternPaths(routeID, patternIds)

        const pattern = patterns.filter((p) => p.directionID === directionID)
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
      getRoutes: Effect.fn(() => routesCache.get("routes")), // singleton cache so key doesnt matter

      getDirections: Effect.fn(function*(routeID: string) {
        const routes = yield* routesCache.get("routes")
        const route = routes.find((r) => r.id === routeID)
        return route ? route.directionList : []
      }),

      getStops: Effect.fn(function*(routeID: string, directionID: string) {
        const cacheKey = `${routeID}:${directionID}`
        return yield* stopsCache.get(cacheKey)
      })
    }
  }),
  dependencies: [AggieSpiritApi.Default]
}) {
}
