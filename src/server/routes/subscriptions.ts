import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { DatabaseService } from "../../db/index.ts"
import { NameResolver } from "../../services/NameResolver.ts"
import type { CreateSubscriptionRequest } from "../../shared/api.ts"
import { errorResponse, withDefectHandler } from "../helpers/responses.ts"

/**
 * Subscription CRUD routes
 */
export const subscriptionRoutes = HttpRouter.empty.pipe(
  // GET /api/v1/devices/:deviceId/subscriptions - List all subscriptions for a device
  HttpRouter.get(
    "/api/v1/devices/:deviceId/subscriptions",
    Effect.gen(function*() {
      const database = yield* DatabaseService
      const nameResolver = yield* NameResolver
      const { deviceId } = yield* HttpRouter.params

      const subs = yield* database.getSubscriptions(deviceId!)
      const response = yield* Effect.all(
        subs.map((sub) => nameResolver.resolveSubscription(sub)),
        { concurrency: "unbounded" }
      )
      return yield* HttpServerResponse.json(response)
    }).pipe(withDefectHandler("GET /api/v1/devices/:deviceId/subscriptions"))
  ),

  // POST /api/v1/devices/:deviceId/subscriptions - Create a new subscription
  HttpRouter.post(
    "/api/v1/devices/:deviceId/subscriptions",
    Effect.gen(function*() {
      const database = yield* DatabaseService
      const nameResolver = yield* NameResolver
      const { deviceId } = yield* HttpRouter.params
      const req = yield* HttpServerRequest.HttpServerRequest
      const body = yield* req.json as Effect.Effect<CreateSubscriptionRequest>

      // Validate required fields
      if (!body.routeId || !body.directionId || !body.stopId) {
        return yield* errorResponse("BAD_REQUEST", "Missing required fields", 400)
      }

      // Ensure device exists
      yield* database.upsertDevice(deviceId!)

      // Create the subscription
      const sub = yield* database.addSubscription(deviceId!, {
        routeId: body.routeId,
        directionId: body.directionId,
        stopId: body.stopId,
        notifyMinutes: body.notifyMinutes ?? 5,
        timeRangeStart: body.timeRangeStart ?? "00:00",
        timeRangeEnd: body.timeRangeEnd ?? "23:59"
      })

      yield* Effect.logInfo(`Created subscription ${sub.id} for device ${deviceId}`)

      // Resolve names for response
      const response = yield* nameResolver.resolveSubscription(sub)
      return yield* HttpServerResponse.json(response, { status: 201 })
    }).pipe(withDefectHandler("POST /api/v1/devices/:deviceId/subscriptions"))
  ),

  // GET /api/v1/subscriptions/:id - Get a single subscription
  HttpRouter.get(
    "/api/v1/subscriptions/:id",
    Effect.gen(function*() {
      const database = yield* DatabaseService
      const nameResolver = yield* NameResolver
      const { id } = yield* HttpRouter.params

      const sub = yield* database.getSubscription(id!)
      if (!sub) {
        return yield* errorResponse("NOT_FOUND", "Subscription not found", 404)
      }

      const response = yield* nameResolver.resolveSubscription(sub)
      return yield* HttpServerResponse.json(response)
    }).pipe(withDefectHandler("GET /api/v1/subscriptions/:id"))
  ),

  // DELETE /api/v1/subscriptions/:id - Delete a subscription
  HttpRouter.del(
    "/api/v1/subscriptions/:id",
    Effect.gen(function*() {
      const database = yield* DatabaseService
      const { id } = yield* HttpRouter.params

      // Check if subscription exists
      const existing = yield* database.getSubscription(id!)
      if (!existing) {
        return yield* errorResponse("NOT_FOUND", "Subscription not found", 404)
      }

      yield* database.deleteSubscription(id!)
      yield* Effect.logInfo(`Deleted subscription ${id}`)

      return yield* HttpServerResponse.json({ success: true }, { status: 200 })
    }).pipe(withDefectHandler("DELETE /api/v1/subscriptions/:id"))
  )
)
