import { Effect } from "effect"
import type { Subscription } from "../db/schema/common"
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

  const getRouteName = Effect.fn(function*(routeId: string) {
    const routes = yield* cache.getRoutes()
    const route = routes.find((r) => r.id === routeId)
    return route?.shortName ?? "Unknown Route"
  })

  const getDirectionName = Effect.fn(function*(routeId: string, directionId: string) {
    const directions = yield* cache.getDirections(routeId)
    const direction = directions.find((d) => d.id === directionId)
    return direction?.name ?? "Unknown Direction"
  })

  const getStopName = Effect.fn(function*(routeId: string, directionId: string, stopId: string) {
    const stops = yield* cache.getStops(routeId, directionId)
    const stop = stops.find((s) => s.code === stopId)
    return stop?.name ?? "Unknown Stop"
  })

  const resolveNames = Effect.fn(function*(
    routeId: string,
    directionId: string,
    stopId: string
  ) {
    const [routeName, directionName, stopName] = yield* Effect.all([
      getRouteName(routeId),
      getDirectionName(routeId, directionId),
      getStopName(routeId, directionId, stopId)
    ])
    return { routeName, directionName, stopName } as ResolvedNames
  })

  const resolveSubscription = Effect.fn(function*(sub: Subscription) {
    const names = yield* resolveNames(sub.routeId, sub.directionId, sub.stopId)
    return {
      id: sub.id,
      deviceId: sub.deviceId,
      routeId: sub.routeId,
      directionId: sub.directionId,
      stopId: sub.stopId,
      notifyMinutes: sub.notifyMinutes,
      timeRangeStart: sub.timeRangeStart,
      timeRangeEnd: sub.timeRangeEnd,
      routeName: names.routeName,
      directionName: names.directionName,
      stopName: names.stopName,
      createdAt: sub.createdAt.toISOString()
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
