import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, HttpApiError } from "@effect/platform";
import { Schema } from "effect";
import {
  SubscriptionSchema,
  SubscriptionCreationParams,
  SubscriptionUpdateParams,
} from "@bussy/schemas";
import { TokenAuthorization } from "./token-auth";

const idParam = HttpApiSchema.param("id", SubscriptionSchema.fields.id);

export const SubscriptionGroup = HttpApiGroup.make("subscription")
  .add(
    HttpApiEndpoint.post("createSubscription", "/")
      .setPayload(SubscriptionCreationParams)
      .addSuccess(SubscriptionSchema),
  )
  .add(
    HttpApiEndpoint.get("getSubscription", "/:id")
      .setPath(Schema.Struct({ id: idParam }))
      .addSuccess(SubscriptionSchema)
      .addError(HttpApiError.NotFound),
  )
  .add(HttpApiEndpoint.get("listSubscriptions", "/").addSuccess(Schema.Array(SubscriptionSchema)))
  .add(
    HttpApiEndpoint.patch("updateSubscription", "/:id")
      .setPath(Schema.Struct({ id: idParam }))
      .setPayload(SubscriptionUpdateParams)
      .addSuccess(SubscriptionSchema)
      .addError(HttpApiError.NotFound),
  )
  .add(HttpApiEndpoint.del("deleteSubscription", "/:id").setPath(Schema.Struct({ id: idParam })))
  .middleware(TokenAuthorization);
