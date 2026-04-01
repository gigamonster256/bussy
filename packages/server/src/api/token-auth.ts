import {
  HttpApiError,
  HttpApiMiddleware,
  HttpApiSecurity
} from "@effect/platform"
import { Context, Layer, Effect, Redacted } from "effect"
import { Device, DeviceService } from "../device"

// Define a Context.Tag for the authenticated user
export class CurrentDevice extends Context.Tag("CurrentDevice")<CurrentDevice, Device>() {}

// Create the Authorization middleware
export class TokenAuthorization extends HttpApiMiddleware.Tag<TokenAuthorization>()(
  "TokenAuthorization",
  {
    failure: HttpApiError.Unauthorized,
    provides: CurrentDevice,
    security: {
      tokenBearer: HttpApiSecurity.bearer
    }
  }
) {}

export const TokenAuthorizationLive = Layer.effect(
  TokenAuthorization,
  Effect.gen(function* () {
    const devices = yield* DeviceService

    return {
      tokenBearer: (bearerToken) =>
        Effect.gen(function* () {
          yield* Effect.log(
            "checking bearer token",
            Redacted.value(bearerToken)
          )

          const device = yield* devices.getByToken(Redacted.value(bearerToken)).pipe(
            Effect.mapError(() => new HttpApiError.Unauthorized()),
          )

          return device
        })
    }
  })
)