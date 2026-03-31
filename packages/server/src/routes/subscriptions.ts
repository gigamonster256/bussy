import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { DatabaseService } from "../drizzle"
import { NameResolver } from "../services/NameResolver"
import type { CreateSubscriptionRequest } from "../shared/api"
import { errorResponse, withDefectHandler } from "../helpers/responses"

/**
 * Subscription CRUD routes
 */
export const subscriptionRoutes = HttpRouter.empty.pipe(
  // GET /api/v1/devices/:deviceID/subscriptions - List all subscriptions for a device
  HttpRouter.get(
    "/api/v1/devices/:deviceID/subscriptions",
    Effect.gen(function*() {
      const database = yield* DatabaseService
      const nameResolver = yield* NameResolver
      const { deviceID } = yield* HttpRouter.params

      const subs = yield* database.getSubscriptions(deviceID!)
      const response = yield* Effect.all(
        subs.map((sub) => nameResolver.resolveSubscription(sub)),
        { concurrency: "unbounded" }
      )
      return yield* HttpServerResponse.json(response)
    }).pipe(withDefectHandler("GET /api/v1/devices/:deviceID/subscriptions"))
  ),

  // POST /api/v1/devices/:deviceID/subscriptions - Create a new subscription
  HttpRouter.post(
    "/api/v1/devices/:deviceID/subscriptions",
    Effect.gen(function*() {
      const database = yield* DatabaseService
      const nameResolver = yield* NameResolver
      const { deviceID } = yield* HttpRouter.params
      const req = yield* HttpServerRequest.HttpServerRequest
      const body = yield* req.json as Effect.Effect<CreateSubscriptionRequest>

      // Validate required fields
      if (!body.routeID || !body.directionID || !body.stopID) {
        return yield* errorResponse("BAD_REQUEST", "Missing required fields", 400)
      }

      // Ensure device exists
      yield* database.upsertDevice(deviceID!)

      // Create the subscription
      const sub = yield* database.addSubscription(deviceID!, {
        routeID: body.routeID,
        directionID: body.directionID,
        stopID: body.stopID,
        notifyMinutes: body.notifyMinutes ?? 5,
        timeRangeStart: body.timeRangeStart ?? "00:00",
        timeRangeEnd: body.timeRangeEnd ?? "23:59"
      })

      yield* Effect.logInfo(`Created subscription ${sub.id} for device ${deviceID}`)

      // Resolve names for response
      const response = yield* nameResolver.resolveSubscription(sub)
      return yield* HttpServerResponse.json(response, { status: 201 })
    }).pipe(withDefectHandler("POST /api/v1/devices/:deviceID/subscriptions"))
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
