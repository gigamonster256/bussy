import { Effect } from "effect"
import { HttpApiBuilder, HttpApiError, } from "@effect/platform"
import { BussyApi } from "../api"
import { DeviceService } from "../../device"

export const HttpDeviceLive = HttpApiBuilder.group(BussyApi, "device", (handlers) =>
  Effect.gen(function*() {
    const devices = yield* DeviceService
    
    return handlers
      .handle("get", 
        Effect.fn("HttpDeviceLive.get")(function*({ path: { id } }) {
          return yield* devices.getByID(id).pipe(
            Effect.tapError((error) => 
              Effect.logError(`Error fetching device with id ${id}:`, error)
            ),
            Effect.mapError(() => new HttpApiError.InternalServerError())
          )
        })
      ).handle("create", 
        Effect.fn("HttpDeviceLive.create")(function*() {
          const device = yield* devices.create().pipe(
            Effect.tapError((error) => 
              Effect.logError("Error creating device:", error)
            ),
            Effect.mapError(() => new HttpApiError.InternalServerError())
          )
          return device
        }
      )
    )
  })
)
