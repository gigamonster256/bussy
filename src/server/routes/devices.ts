import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { DatabaseService } from "../../db/index.ts"
import { errorResponse, withDefectHandler } from "../helpers/responses.ts"

/**
 * Device registration routes
 */
export const deviceRoutes = HttpRouter.empty.pipe(
  // POST /api/v1/devices - Register a device
  HttpRouter.post(
    "/api/v1/devices",
    Effect.gen(function*() {
      const database = yield* DatabaseService
      const req = yield* HttpServerRequest.HttpServerRequest
      const body = yield* req.json as Effect.Effect<{ deviceId: string }>

      yield* Effect.logDebug(`Device registration request for: ${body.deviceId || "(missing)"}`)

      if (!body.deviceId) {
        yield* Effect.logWarning("Device registration failed: missing deviceId")
        return yield* errorResponse("BAD_REQUEST", "deviceId is required", 400)
      }

      yield* Effect.logDebug(`Upserting device: ${body.deviceId}`)
      const device = yield* database.upsertDevice(body.deviceId)
      yield* Effect.logInfo(`Device registered: ${device.id}`)

      return yield* HttpServerResponse.json({
        deviceId: device.id,
        createdAt: device.createdAt.toISOString()
      })
    }).pipe(withDefectHandler("POST /api/v1/devices"))
  ),

  // DELETE /api/v1/devices/:deviceId - Delete a device and all its subscriptions
  HttpRouter.del(
    "/api/v1/devices/:deviceId",
    Effect.gen(function*() {
      const database = yield* DatabaseService
      const { deviceId } = yield* HttpRouter.params

      yield* Effect.logDebug(`Device delete request for: ${deviceId}`)

      // Check if device exists
      const device = yield* database.getDevice(deviceId!)
      if (!device) {
        yield* Effect.logWarning(`Device delete failed: device not found: ${deviceId}`)
        return yield* errorResponse("NOT_FOUND", "Device not found", 404)
      }

      // Delete device (FK cascade handles subscriptions)
      yield* Effect.logDebug(`Deleting device: ${deviceId}`)
      yield* database.deleteDevice(deviceId!)
      yield* Effect.logInfo(`Deleted device ${deviceId} and all associated subscriptions`)

      return yield* HttpServerResponse.json({ success: true })
    }).pipe(withDefectHandler("DELETE /api/v1/devices/:deviceId"))
  )
)
