import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { DatabaseService } from "../drizzle"
import { WebPushService } from "../services/WebPushService"
import type { RegisterPushRequest } from "../shared/api"
import { errorResponse, withDefectHandler } from "../helpers/responses"

/**
 * Push notification routes
 */
export const pushRoutes = HttpRouter.empty.pipe(
  // GET /api/v1/push/vapid-key - Get the VAPID public key for push registration
  HttpRouter.get(
    "/api/v1/push/vapid-key",
    Effect.gen(function*() {
      const pushService = yield* WebPushService
      const publicKey = yield* pushService.getPublicKey
      return yield* HttpServerResponse.json({ publicKey })
    }).pipe(withDefectHandler("GET /api/v1/push/vapid-key"))
  ),

  // POST /api/v1/devices/:deviceID/push - Register a push subscription for a device
  HttpRouter.post(
    "/api/v1/devices/:deviceID/push",
    Effect.gen(function*() {
      const database = yield* DatabaseService
      const { deviceID } = yield* HttpRouter.params
      const req = yield* HttpServerRequest.HttpServerRequest
      const body = yield* req.json as Effect.Effect<{ subscription: RegisterPushRequest["subscription"] }>

      if (!body.subscription?.endpoint || !body.subscription?.keys) {
        return yield* errorResponse("BAD_REQUEST", "Invalid push subscription data", 400)
      }

      // Update device with push subscription
      yield* database.updatePushSubscription(
        deviceID!,
        body.subscription.endpoint,
        body.subscription.keys.p256dh,
        body.subscription.keys.auth
      )

      yield* Effect.logInfo(`Push subscription registered for device ${deviceID}`)
      return yield* HttpServerResponse.json({ success: true })
    }).pipe(withDefectHandler("POST /api/v1/devices/:deviceID/push"))
  ),

  // DELETE /api/v1/devices/:deviceID/push - Unsubscribe from push notifications
  HttpRouter.del(
    "/api/v1/devices/:deviceID/push",
    Effect.gen(function*() {
      const database = yield* DatabaseService
      const { deviceID } = yield* HttpRouter.params

      // Clear push subscription from device
      yield* database.updatePushSubscription(deviceID!, "", "", "")

      yield* Effect.logInfo(`Push subscription removed for device ${deviceID}`)
      return yield* HttpServerResponse.json({ success: true })
    }).pipe(withDefectHandler("DELETE /api/v1/devices/:deviceID/push"))
  )
)
