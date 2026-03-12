import { HttpRouter, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { MetadataCache } from "../services/MetadataCache"
import { withDefectHandler } from "../helpers/responses"

/**
 * Metadata routes - routes, directions, stops
 */
export const metadataRoutes = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/api/v1/routes",
    Effect.gen(function*() {
      const cache = yield* MetadataCache
      const routes = yield* cache.getRoutes()
      return yield* HttpServerResponse.json(routes)
    }).pipe(withDefectHandler("GET /api/v1/routes"))
  ),
  HttpRouter.get(
    "/api/v1/routes/:routeId/directions",
    Effect.gen(function*() {
      const cache = yield* MetadataCache
      const { routeId } = yield* HttpRouter.params
      const directions = yield* cache.getDirections(routeId!)
      return yield* HttpServerResponse.json(directions)
    }).pipe(withDefectHandler("GET /api/v1/routes/:routeId/directions"))
  ),
  HttpRouter.get(
    "/api/v1/routes/:routeId/directions/:directionId/stops",
    Effect.gen(function*() {
      const cache = yield* MetadataCache
      const { directionId, routeId } = yield* HttpRouter.params
      const stops = yield* cache.getStops(routeId!, directionId!)
      return yield* HttpServerResponse.json(stops)
    }).pipe(withDefectHandler("GET /api/v1/routes/:routeId/directions/:directionId/stops"))
  )
)
