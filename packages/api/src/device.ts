import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";
import { DeviceSchema } from "@bussy/schemas";

const idParam = HttpApiSchema.param("id", DeviceSchema.fields.id);

export const PushSubscriptionData = Schema.Struct({
  endpoint: Schema.String,
  keys: Schema.Struct({
    p256dh: Schema.String,
    auth: Schema.String,
  }),
});

export const PushSubscriptionResponse = Schema.Struct({
  success: Schema.Boolean,
});

export const DeviceGroup = HttpApiGroup.make("device")
  .add(HttpApiEndpoint.post("create")`/`.addSuccess(DeviceSchema))
  .add(HttpApiEndpoint.get("get")`/${idParam}`.addSuccess(DeviceSchema))
  .add(HttpApiEndpoint.del("delete")`/${idParam}`)
  .add(
    HttpApiEndpoint.put("registerPushSubscription", "/:id/push")
      .setPath(Schema.Struct({ id: idParam }))
      .setPayload(PushSubscriptionData)
      .addSuccess(PushSubscriptionResponse),
  )
  .add(
    HttpApiEndpoint.del("unregisterPushSubscription", "/:id/push")
      .setPath(Schema.Struct({ id: idParam }))
      .addSuccess(PushSubscriptionResponse),
  );
