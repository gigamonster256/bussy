import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"
import { SubscriptionSchema } from "@bussy/schemas"
import { TokenAuthorization } from "./token-auth"

const idParam = HttpApiSchema.param("id", SubscriptionSchema.fields.id)

export const SubscriptionGroup = HttpApiGroup.make("subscription")
  .add(
    HttpApiEndpoint.post("createSubscription")`/`
      .setPayload(SubscriptionSchema)
      .addSuccess(SubscriptionSchema)
  ).add(
    HttpApiEndpoint.get("getSubscription")`/${idParam}`
      .addSuccess(SubscriptionSchema)
  ).add(
    HttpApiEndpoint.get("listSubscriptions")`/`
      .addSuccess(Schema.Array(SubscriptionSchema))
  ).middleware(TokenAuthorization)
