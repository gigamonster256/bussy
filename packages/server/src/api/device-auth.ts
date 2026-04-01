import {
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity
} from "@effect/platform"
import { Context, Effect, Redacted, Schema } from "effect"
import { Device, DeviceSelect, DeviceService } from "../device"

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
  HttpApiSchema.annotations({ status: 401 })
) {}

export class CurrentDevice extends Context.Tag("CurrentDevice")<CurrentDevice, Device>() {}

export class DeviceAuthorization extends HttpApiMiddleware.Tag<DeviceAuthorization>()(
  "DeviceAuthorization",
  {
    failure: Unauthorized,
    provides: CurrentDevice,
    security: {
      bearer: HttpApiSecurity.bearer
    }
  }
) {}

export const DeviceAuthorizationLive = HttpApiMiddleware.of(DeviceAuthorization).pipe(
  Effect.map(() => ({
    bearer: (token: Redacted.Redacted) =>
      DeviceService.pipe(
        Effect.flatMap((service) => service.getByToken(Redacted.value(token))),
        Effect.mapError(() => new Unauthorized())
      )
  }))
)