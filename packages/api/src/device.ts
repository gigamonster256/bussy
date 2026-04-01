import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { DeviceCreationResponse, DeviceSelect } from "./schemas/device"

const idParam = HttpApiSchema.param("id", DeviceSelect.fields.id)

export const DeviceGroup = HttpApiGroup.make("device")
  .add(
    HttpApiEndpoint.post("create")`/`
      .addSuccess(DeviceCreationResponse)
  ).add(
    HttpApiEndpoint.get("get")`/${idParam}`
      .addSuccess(DeviceSelect)
  )
