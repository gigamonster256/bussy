import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { DeviceSchema } from "@bussy/schemas";

const idParam = HttpApiSchema.param("id", DeviceSchema.fields.id);

export const DeviceGroup = HttpApiGroup.make("device")
  .add(HttpApiEndpoint.post("create")`/`.addSuccess(DeviceSchema))
  .add(HttpApiEndpoint.get("get")`/${idParam}`.addSuccess(DeviceSchema));
