import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"
import { SubscriptionCreationParams, SubscriptionCreationResponse, SubscriptionSelect } from "../../subscription"
import { TokenAuthorization } from "../token-auth"

const idParam = HttpApiSchema.param("id", SubscriptionSelect.fields.id)

export const SubscriptionGroup = HttpApiGroup.make("subscription")
  .add(
    HttpApiEndpoint.post("createSubscription")`/`
      .setPayload(SubscriptionCreationParams)
      .addSuccess(SubscriptionCreationResponse)
  ).add(
    HttpApiEndpoint.get("getSubscription")`/${idParam}`
      .addSuccess(SubscriptionSelect)
  ).add(
    HttpApiEndpoint.get("listSubscriptions")`/`
      .addSuccess(Schema.Array(SubscriptionSelect))
  ).middleware(TokenAuthorization)
