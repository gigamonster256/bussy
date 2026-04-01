import { Console, Effect } from "effect"
import { HttpApiBuilder } from "@effect/platform"
import { BussyApi } from "./api"
import { DeviceService } from "../device"

export const DeviceLive = HttpApiBuilder.group(BussyApi, "device", (handlers) =>
  Effect.gen(function*() {
    const devices = yield* DeviceService
    return handlers
      .handle("getDevice", 
        Effect.fn("getDevice")(function*({ path: { id } }) {
          return yield* devices.getByID(id).pipe(
            Effect.catchAll((error) =>
              Effect.gen(function*() {
                yield* Console.error(`Error getting device ${id}:`, error)
                return {
                  id,
                  token: "error-getting-device",
                  pushEndpoint: null,
                  pushP256dh: null,
                  pushAuth: null,
                  timeCreated: new Date(),
                  timeUpdated: new Date()
                }
              })
            )
          )
        })
      ).handle("createDevice", 
        Effect.fn("createDevice")(function*() {
          return yield* devices.create().pipe(
            Effect.catchAll((error) =>
              Effect.gen(function*() {
                yield* Console.error("Error creating device:", error)
                return {id: "error-creating-device", token: "error-creating-device"}
              })
            )
          )
        }))
  })
)