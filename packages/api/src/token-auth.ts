import {
  HttpApiError,
  HttpApiMiddleware,
  HttpApiSecurity
} from "@effect/platform"
import { Context } from "effect"
import { Device } from "./schemas/device"

export class CurrentDevice extends Context.Tag("CurrentDevice")<CurrentDevice, Device>() {}

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
