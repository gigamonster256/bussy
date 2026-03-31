import { Effect } from "effect"
import type { Subscription } from "../subscription"
import type { SubscriptionResponse } from "../shared/api"
import { MetadataCache } from "./MetadataCache"

/**
 * Resolved names for a subscription's route, direction, and stop
 */
export interface ResolvedNames {
  readonly routeName: string
  readonly directionName: string
  readonly stopName: string
}

const nameResolverEffect = Effect.gen(function*() {
  const cache = yield* MetadataCache

  const getRouteName = Effect.fn(function*(routeID: string) {
    const routes = yield* cache.getRoutes()
    const route = routes.find((r) => r.id === routeID)
    return route?.shortName ?? "Unknown Route"
  })

  const getDirectionName = Effect.fn(function*(routeID: string, directionID: string) {
    const directions = yield* cache.getDirections(routeID)
    const direction = directions.find((d) => d.id === directionID)
    return direction?.name ?? "Unknown Direction"
  })

  const getStopName = Effect.fn(function*(routeID: string, directionID: string, stopID: string) {
    const stops = yield* cache.getStops(routeID, directionID)
    const stop = stops.find((s) => s.code === stopID)
    return stop?.name ?? "Unknown Stop"
  })

  const resolveNames = Effect.fn(function*(
    routeID: string,
    directionID: string,
    stopID: string
  ) {
    const [routeName, directionName, stopName] = yield* Effect.all([
      getRouteName(routeID),
      getDirectionName(routeID, directionID),
      getStopName(routeID, directionID, stopID)
    ])
    return { routeName, directionName, stopName } as ResolvedNames
  })

  const resolveSubscription = Effect.fn(function*(sub: Subscription) {
    const names = yield* resolveNames(sub.routeID, sub.directionID, sub.stopID)
    return {
      id: sub.id,
      deviceID: sub.deviceID,
      routeID: sub.routeID,
      directionID: sub.directionID,
      stopID: sub.stopID,
      notifyMinutes: sub.notifyMinutes,
      timeRangeStart: sub.timeRangeStart,
      timeRangeEnd: sub.timeRangeEnd,
      routeName: names.routeName,
      directionName: names.directionName,
      stopName: names.stopName,
      timeCreated: sub.timeCreated.toISOString()
    } as SubscriptionResponse
  })

  return {
    getRouteName,
    getDirectionName,
    getStopName,
    resolveNames,
    resolveSubscription
  }
})

/**
 * Service for resolving route/direction/stop IDs to human-readable names.
 * Uses the MetadataCache to lookup names, falling back to "Unknown" if not found.
 */
export class NameResolver extends Effect.Service<NameResolver>()("NameResolver", {
  effect: nameResolverEffect,
  dependencies: [MetadataCache.Default]
}) {}
