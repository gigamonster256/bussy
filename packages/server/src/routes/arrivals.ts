import { HttpRouter, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { DatabaseService } from "../../db/index.ts"
import { AggieSpiritApi } from "../../services/AggieSpiritApi.ts"
import { arrivalToResponse } from "@bussy/shared/api"
import { withDefectHandler } from "../helpers/responses.ts"

/**
 * Arrivals routes
 */
export const arrivalRoutes = HttpRouter.empty.pipe(
  // GET /api/v1/routes/:routeId/directions/:directionId/stops/:stopCode/arrivals - Get arrivals for a stop
  HttpRouter.get(
    "/api/v1/routes/:routeId/directions/:directionId/stops/:stopCode/arrivals",
    Effect.gen(function*() {
      const api = yield* AggieSpiritApi
      const { directionId, routeId, stopCode } = yield* HttpRouter.params

      const arrivals = yield* api.getNextDepartureTimes(routeId!, [directionId!], stopCode!)
      const response = arrivals.map(arrivalToResponse)

      return yield* HttpServerResponse.json(response)
    }).pipe(withDefectHandler("GET /api/v1/routes/.../arrivals"))
  ),

  // GET /api/v1/devices/:deviceId/arrivals - Batch arrivals for all device subscriptions
  HttpRouter.get(
    "/api/v1/devices/:deviceId/arrivals",
    Effect.gen(function*() {
      const api = yield* AggieSpiritApi
      const database = yield* DatabaseService
      const { deviceId } = yield* HttpRouter.params

      // Get all subscriptions for this device
      const subs = yield* database.getSubscriptions(deviceId!)

      if (subs.length === 0) {
        return yield* HttpServerResponse.json({ arrivals: {} })
      }

      // Fetch arrivals for each subscription in parallel
      const results = yield* Effect.all(
        subs.map((sub) =>
          Effect.gen(function*() {
            const arrivals = yield* api.getNextDepartureTimes(
              sub.routeId,
              [sub.directionId],
              sub.stopId
            ).pipe(
              Effect.map((arr) => arr.map(arrivalToResponse)),
              Effect.catchAll(() => Effect.succeed([]))
            )
            return { id: String(sub.id), arrivals }
          })
        ),
        { concurrency: 5 }
      )

      // Build response object
      const arrivalsMap: Record<string, typeof results[0]["arrivals"]> = {}
      for (const { arrivals, id } of results) {
        arrivalsMap[id] = arrivals
      }

      return yield* HttpServerResponse.json({ arrivals: arrivalsMap })
    }).pipe(withDefectHandler("GET /api/v1/devices/:deviceId/arrivals"))
  )
)
