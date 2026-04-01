import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"
import { TokenAuthorization } from "../token-auth"

export const HealthGroup = HttpApiGroup.make("health")
  .add(
    HttpApiEndpoint.get("health")`/`
      .addSuccess(Schema.String)
  ).add(
    HttpApiEndpoint.get("secure")`/secure`
      .addSuccess(Schema.String)
      .middleware(TokenAuthorization)
  )
