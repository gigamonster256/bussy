import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"
import { DeviceSelect } from "../device"

const idParam = HttpApiSchema.param("id", Schema.String)

export const BussyApi = HttpApi.make("BussyApi").add(
  HttpApiGroup.make("health").add(
    HttpApiEndpoint.get("health")`/`.addSuccess(Schema.Void)
  ).prefix("/health"))
  .add(
  HttpApiGroup.make("device")
    .add(
      HttpApiEndpoint.get("getDevice")`/${idParam}`.addSuccess(DeviceSelect))
    .add(
      HttpApiEndpoint.post("createDevice")`/`.addSuccess(Schema.String)
  ).prefix("/device")
)