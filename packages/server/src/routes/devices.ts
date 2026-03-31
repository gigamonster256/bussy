import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { DatabaseService } from "../drizzle"
import { errorResponse, withDefectHandler } from "../helpers/responses"

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
      const body = yield* req.json as Effect.Effect<{ deviceID: string }>

      yield* Effect.logDebug(`Device registration request for: ${body.deviceID || "(missing)"}`)

      if (!body.deviceID) {
        yield* Effect.logWarning("Device registration failed: missing deviceID")
        return yield* errorResponse("BAD_REQUEST", "deviceID is required", 400)
      }

      yield* Effect.logDebug(`Upserting device: ${body.deviceID}`)
      const device = yield* database.upsertDevice(body.deviceID)
      yield* Effect.logInfo(`Device registered: ${device.id}`)

      return yield* HttpServerResponse.json({
        deviceID: device.id,
        timeCreated: device.timeCreated.toISOString()
      })
    }).pipe(withDefectHandler("POST /api/v1/devices"))
  ),

  // DELETE /api/v1/devices/:deviceID - Delete a device and all its subscriptions
  HttpRouter.del(
    "/api/v1/devices/:deviceID",
    Effect.gen(function*() {
      const database = yield* DatabaseService
      const { deviceID } = yield* HttpRouter.params

      yield* Effect.logDebug(`Device delete request for: ${deviceID}`)

      // Check if device exists
      const device = yield* database.getDevice(deviceID!)
      if (!device) {
        yield* Effect.logWarning(`Device delete failed: device not found: ${deviceID}`)
        return yield* errorResponse("NOT_FOUND", "Device not found", 404)
      }

      // Delete device (FK cascade handles subscriptions)
      yield* Effect.logDebug(`Deleting device: ${deviceID}`)
      yield* database.deleteDevice(deviceID!)
      yield* Effect.logInfo(`Deleted device ${deviceID} and all associated subscriptions`)

      return yield* HttpServerResponse.json({ success: true })
    }).pipe(withDefectHandler("DELETE /api/v1/devices/:deviceID"))
  )
)
