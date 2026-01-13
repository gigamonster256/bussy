import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { DatabaseService } from "../../db/index.ts"
import { WebPushService } from "../../services/WebPushService.ts"
import type { RegisterPushRequest } from "../../shared/api.ts"
import { errorResponse, withDefectHandler } from "../helpers/responses.ts"

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

  // POST /api/v1/devices/:deviceId/push - Register a push subscription for a device
  HttpRouter.post(
    "/api/v1/devices/:deviceId/push",
    Effect.gen(function*() {
      const database = yield* DatabaseService
      const { deviceId } = yield* HttpRouter.params
      const req = yield* HttpServerRequest.HttpServerRequest
      const body = yield* req.json as Effect.Effect<{ subscription: RegisterPushRequest["subscription"] }>

      if (!body.subscription?.endpoint || !body.subscription?.keys) {
        return yield* errorResponse("BAD_REQUEST", "Invalid push subscription data", 400)
      }

      // Update device with push subscription
      yield* database.updatePushSubscription(
        deviceId!,
        body.subscription.endpoint,
        body.subscription.keys.p256dh,
        body.subscription.keys.auth
      )

      yield* Effect.logInfo(`Push subscription registered for device ${deviceId}`)
      return yield* HttpServerResponse.json({ success: true })
    }).pipe(withDefectHandler("POST /api/v1/devices/:deviceId/push"))
  ),

  // DELETE /api/v1/devices/:deviceId/push - Unsubscribe from push notifications
  HttpRouter.del(
    "/api/v1/devices/:deviceId/push",
    Effect.gen(function*() {
      const database = yield* DatabaseService
      const { deviceId } = yield* HttpRouter.params

      // Clear push subscription from device
      yield* database.updatePushSubscription(deviceId!, "", "", "")

      yield* Effect.logInfo(`Push subscription removed for device ${deviceId}`)
      return yield* HttpServerResponse.json({ success: true })
    }).pipe(withDefectHandler("DELETE /api/v1/devices/:deviceId/push"))
  )
)
